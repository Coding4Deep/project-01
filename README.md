<div align="center">
   
# **3-Tier Spring-Boot App (MongoDB,Memecached,RabbitMQ)**

</div>

<div align="center">
   
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Memcached](https://img.shields.io/badge/Memcached-2C3A3A?style=for-the-badge&logo=memcached&logoColor=white)](https://memcached.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Maven](https://img.shields.io/badge/Maven-C71A36?style=for-the-badge&logo=apachemaven&logoColor=white)](https://maven.apache.org/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)

</div>

<div align="center">

> A production-ready Spring Boot microservice powered by MongoDB, RabbitMQ, and Memcached. Designed for scalable backends, async messaging, and ultra-fast caching. Containerized with Docker for seamless deployment

</div>

- ✅ Spring Boot REST APIs  
- ✅ MongoDB Integration  
- ✅ Dockerized Deployment  
- ✅ Docker Compose Orchestration  
- ✅ Clean Maven Project Structure  


## **Project Description**

This project showcases a standard 3-tier architecture:

1. **👨‍💻 Presentation Layer** – User interacts via API/UI  
2. **⚙️ Application Layer** – Spring Boot backend processes logic  
3. **🗄️ Data Layer** – MongoDB for persistent storage

Ideal for DevOps learners, CI/CD pipelines, Docker orchestration, and cloud-native application testing.



## **Features**

- Light/dark mode toggle
- Live previews
- Fullscreen mode
- Cross platform


##  **Tech Stack**

| Layer               | Technology           |
|--------------------|----------------------|
| Frontend (optional) | HTML/CSS (planned)   |
| Backend             | Java 17, Spring Boot |
| Database            | MongoDB              |
| Containerization    | Docker, Docker Compose |
| Build Tool          | Maven                |

## Prerequisites
Before you begin, ensure you have:

✅ Java 17+

✅ Maven

✅ Docker

✅ Docker Compose


#  **How to Run the Project**

## *Getting Started*:-

Follow these steps to get the project up and running on your machine.

---

###   Step 1: Clone the Repository

```bash
git clone https://github.com/Coding4Deep/3-tier-spring-mongo.git
cd 3-tier-spring-mongo
```

---

### Step 2: Build the Spring Boot Application

```bash
./mvnw clean package
```

---

###  Step 3: Start Containers via Docker Compose

```bash
docker-compose up --build
```

> ⏱️ Wait a few seconds for the application and MongoDB to initialize.

---

## *Access the Application*:-

- 🔗 API Endpoint: [http://localhost:8080](http://localhost:8080)
- 📔️ MongoDB: `localhost:27017`

You can interact with the backend using tools like:

- 📬 Postman  
- 🌀 Curl  
- 📄 Swagger UI (if integrated)

---

✅ You're all set! Happy coding! 🙌

# **Contributing**

We welcome contributions, feedback, and feature ideas! Here's how you can get involved:

1.  **Fork the Repository**  
   Click on the fork button to create your own copy.

2.  **Create a New Branch**  
   ```bash
   git checkout -b feature/your-feature-name
   ```

3.  **Make Your Changes**  
   Improve the code, add features, or fix bugs.

4.  **Commit Your Changes**  
   ```bash
   git commit -m "Add: a short meaningful commit message"
   ```

5.  **Push to GitHub**  
   ```bash
   git push origin feature/your-feature-name
   ```

6.  **Open a Pull Request**  
   Navigate to your repo on GitHub and open a PR. Describe your changes and reference any related issues.

Thanks for helping improve this project! 💙

>This project is licensed under the [MIT License](LICENSE).
