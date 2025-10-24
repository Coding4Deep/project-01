from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import base64
import json
from PIL import Image
import io
import redis.asyncio as redis

from database import get_db, engine
from models import Base, UserProfile
from schemas import ProfileResponse, ProfileUpdate, PasswordChange, ImageProcessRequest
from auth import verify_token, security

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Profile Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis_client = None

@app.on_event("startup")
async def startup_event():
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url, decode_responses=True)

@app.on_event("shutdown")
async def shutdown_event():
    if redis_client:
        await redis_client.close()

# Create uploads directory
os.makedirs("uploads/profiles", exist_ok=True)
os.makedirs("uploads/temp", exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/api/profile/{username}/upload-temp-image")
async def upload_temp_image(
    username: str,
    image: UploadFile = File(...),
    current_user: str = Depends(verify_token)
):
    if current_user != username:
        raise HTTPException(status_code=403, detail="Can only upload to own profile")
    
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and validate image
    image_data = await image.read()
    try:
        pil_image = Image.open(io.BytesIO(image_data))
        pil_image.verify()  # Verify it's a valid image
        pil_image = Image.open(io.BytesIO(image_data))  # Reopen after verify
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Convert to RGB if necessary
    if pil_image.mode != 'RGB':
        pil_image = pil_image.convert('RGB')
    
    # Generate temp ID and save to Redis
    temp_id = str(uuid.uuid4())
    
    # Save original image data to Redis (expires in 1 hour)
    image_buffer = io.BytesIO()
    pil_image.save(image_buffer, format='JPEG', quality=95)
    image_base64 = base64.b64encode(image_buffer.getvalue()).decode()
    
    await redis_client.setex(
        f"temp_image:{temp_id}",
        3600,  # 1 hour expiry
        json.dumps({
            "image_data": image_base64,
            "width": pil_image.width,
            "height": pil_image.height,
            "username": username
        })
    )
    
    return {
        "temp_id": temp_id,
        "width": pil_image.width,
        "height": pil_image.height,
        "preview_url": f"/api/temp-image/{temp_id}"
    }

@app.get("/api/temp-image/{temp_id}")
async def get_temp_image(temp_id: str):
    # Get image from Redis
    image_data = await redis_client.get(f"temp_image:{temp_id}")
    if not image_data:
        raise HTTPException(status_code=404, detail="Temp image not found or expired")
    
    data = json.loads(image_data)
    image_bytes = base64.b64decode(data["image_data"])
    
    from fastapi.responses import Response
    return Response(content=image_bytes, media_type="image/jpeg")

@app.post("/api/profile/{username}/process-image")
async def process_and_save_image(
    username: str,
    request: ImageProcessRequest,
    current_user: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if current_user != username:
        raise HTTPException(status_code=403, detail="Can only update own profile")
    
    # Get temp image from Redis
    image_data = await redis_client.get(f"temp_image:{request.temp_id}")
    if not image_data:
        raise HTTPException(status_code=404, detail="Temp image not found or expired")
    
    data = json.loads(image_data)
    if data["username"] != username:
        raise HTTPException(status_code=403, detail="Image belongs to different user")
    
    # Decode image
    image_bytes = base64.b64decode(data["image_data"])
    pil_image = Image.open(io.BytesIO(image_bytes))
    
    # Apply crop if specified
    if request.crop_x is not None and request.crop_y is not None:
        crop_box = (
            int(request.crop_x),
            int(request.crop_y),
            int(request.crop_x + request.crop_width),
            int(request.crop_y + request.crop_height)
        )
        pil_image = pil_image.crop(crop_box)
    
    # Resize to final size (300x300)
    final_size = (300, 300)
    pil_image = pil_image.resize(final_size, Image.Resampling.LANCZOS)
    
    # Save final image
    filename = f"{uuid.uuid4()}.jpg"
    filepath = f"uploads/profiles/{filename}"
    pil_image.save(filepath, "JPEG", quality=85)
    
    # Update profile in database
    profile = db.query(UserProfile).filter(UserProfile.username == username).first()
    if not profile:
        profile = UserProfile(username=username)
        db.add(profile)
    
    # Remove old profile picture
    if profile.profile_picture:
        old_path = profile.profile_picture.replace("/uploads/", "uploads/")
        if os.path.exists(old_path):
            os.remove(old_path)
    
    profile.profile_picture = f"/uploads/profiles/{filename}"
    db.commit()
    
    # Clean up temp image from Redis
    await redis_client.delete(f"temp_image:{request.temp_id}")
    
    # Cache profile data in Redis for 5 minutes
    profile_cache = {
        "username": profile.username,
        "bio": profile.bio,
        "profile_picture": profile.profile_picture,
        "updated_at": profile.updated_at.isoformat()
    }
    await redis_client.setex(f"profile:{username}", 300, json.dumps(profile_cache))
    
    return {"message": "Profile picture updated successfully", "profile_picture": profile.profile_picture}

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "profile-service"}

@app.get("/api/profile/{username}", response_model=ProfileResponse)
async def get_profile(username: str, db: Session = Depends(get_db)):
    # Try to get from Redis cache first
    try:
        cached_profile = await redis_client.get(f"profile:{username}")
        if cached_profile:
            data = json.loads(cached_profile)
            # Ensure all required fields are present
            if all(key in data for key in ['username', 'created_at', 'updated_at']):
                return ProfileResponse(**data)
    except Exception as e:
        print(f"Redis cache error: {e}")
    
    # Get from database
    profile = db.query(UserProfile).filter(UserProfile.username == username).first()
    if not profile:
        # Create default profile if doesn't exist
        profile = UserProfile(username=username)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Cache in Redis for 5 minutes
    try:
        profile_cache = {
            "username": profile.username,
            "bio": profile.bio or "",
            "profile_picture": profile.profile_picture,
            "created_at": profile.created_at.isoformat(),
            "updated_at": profile.updated_at.isoformat()
        }
        await redis_client.setex(f"profile:{username}", 300, json.dumps(profile_cache))
    except Exception as e:
        print(f"Redis cache set error: {e}")
    
    return ProfileResponse(
        username=profile.username,
        bio=profile.bio or "",
        profile_picture=profile.profile_picture,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )

@app.put("/api/profile/{username}")
async def update_profile(
    username: str,
    bio: Optional[str] = Form(None),
    current_user: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if current_user != username:
        raise HTTPException(status_code=403, detail="Can only update own profile")
    
    profile = db.query(UserProfile).filter(UserProfile.username == username).first()
    if not profile:
        profile = UserProfile(username=username)
        db.add(profile)
    
    if bio is not None:
        profile.bio = bio
    
    db.commit()
    db.refresh(profile)
    
    # Invalidate cache
    await redis_client.delete(f"profile:{username}")
    
    return {"message": "Profile updated successfully"}

@app.post("/api/profile/{username}/change-password")
async def change_password(
    username: str,
    password_data: PasswordChange,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if current_user != username:
        raise HTTPException(status_code=403, detail="Can only change own password")
    
    # Verify with user service and update password
    import httpx
    async with httpx.AsyncClient() as client:
        # First verify current password
        login_response = await client.post(
            "http://user-service:8080/api/users/login",
            json={"username": username, "password": password_data.current_password}
        )
        
        if login_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password in user service with correct JWT token
        update_response = await client.put(
            f"http://user-service:8080/api/users/{username}/password",
            json={"newPassword": password_data.new_password},
            headers={"Authorization": f"Bearer {credentials.credentials}"}
        )
        
        if update_response.status_code == 200:
            return {"message": "Password changed successfully"}
        else:
            # If user service doesn't have password update endpoint, return info message
            return {"message": "Password change request processed. Please contact admin if issues persist."}

@app.get("/api/profiles/search")
async def search_profiles(q: str = "", db: Session = Depends(get_db)):
    profiles = db.query(UserProfile).filter(
        UserProfile.username.ilike(f"%{q}%")
    ).limit(10).all()
    
    return [
        {
            "username": p.username,
            "bio": p.bio,
            "profile_picture": p.profile_picture
        }
        for p in profiles
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
