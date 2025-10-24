package com.chat.userservice.controller;

import com.chat.userservice.config.TestSecurityConfig;
import com.chat.userservice.entity.User;
import com.chat.userservice.service.UserService;
import com.chat.userservice.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(TestSecurityConfig.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("hashedpassword");
        testUser.setActive(true);
        testUser.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void registerUser_Success() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("username", "newuser");
        request.put("email", "new@example.com");
        request.put("password", "password123");

        when(userService.registerUser(anyString(), anyString(), anyString()))
                .thenReturn(testUser);

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.userId").value(1));
    }

    @Test
    void registerUser_DuplicateUsername() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("username", "existinguser");
        request.put("email", "new@example.com");
        request.put("password", "password123");

        when(userService.registerUser(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Username already exists"));

        mockMvc.perform(post("/api/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Username already exists"));
    }

    @Test
    void loginUser_Success() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("username", "testuser");
        request.put("password", "password123");

        when(userService.authenticateUser(anyString(), anyString()))
                .thenReturn(Optional.of(testUser));
        when(jwtUtil.generateToken(anyString()))
                .thenReturn("mock-jwt-token");

        mockMvc.perform(post("/api/users/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void loginUser_InvalidCredentials() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("username", "testuser");
        request.put("password", "wrongpassword");

        when(userService.authenticateUser(anyString(), anyString()))
                .thenReturn(Optional.empty());

        mockMvc.perform(post("/api/users/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid credentials"));
    }

    @Test
    void getDashboard_Success() throws Exception {
        List<User> users = Arrays.asList(testUser);
        when(userService.getAllUsers()).thenReturn(users);
        when(userService.getTotalUsers()).thenReturn(10L);
        when(userService.getActiveUsers()).thenReturn(8L);

        mockMvc.perform(get("/api/users/dashboard")
                .header("Authorization", "Bearer mock-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(10))
                .andExpect(jsonPath("$.activeUsers").value(8))
                .andExpect(jsonPath("$.users").isArray());
    }

    @Test
    void validateToken_Success() throws Exception {
        when(jwtUtil.isTokenValid(anyString())).thenReturn(true);
        when(jwtUtil.extractUsername(anyString())).thenReturn("testuser");
        when(userService.getUserByUsername(anyString())).thenReturn(Optional.of(testUser));

        mockMvc.perform(get("/api/users/validate")
                .header("Authorization", "Bearer mock-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void validateToken_Invalid() throws Exception {
        when(jwtUtil.isTokenValid(anyString())).thenReturn(false);

        mockMvc.perform(get("/api/users/validate")
                .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false));
    }
}
// Fixed compilation errors
