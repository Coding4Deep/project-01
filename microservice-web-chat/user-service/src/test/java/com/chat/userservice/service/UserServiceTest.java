package com.chat.userservice.service;

import com.chat.userservice.entity.User;
import com.chat.userservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User("testuser", "test@example.com", "encodedPassword");
        testUser.setId(1L);
    }

    @Test
    void registerUser_Success() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User result = userService.registerUser("testuser", "test@example.com", "password123");

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerUser_UsernameExists() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));

        assertThrows(RuntimeException.class, () -> 
            userService.registerUser("testuser", "test@example.com", "password123"));
    }

    @Test
    void registerUser_EmailExists() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));

        assertThrows(RuntimeException.class, () -> 
            userService.registerUser("newuser", "test@example.com", "password123"));
    }

    @Test
    void authenticateUser_Success() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        Optional<User> result = userService.authenticateUser("testuser", "password123");

        assertTrue(result.isPresent());
        assertEquals("testuser", result.get().getUsername());
    }

    @Test
    void authenticateUser_InvalidPassword() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        Optional<User> result = userService.authenticateUser("testuser", "wrongpassword");

        assertFalse(result.isPresent());
    }

    @Test
    void authenticateUser_UserNotFound() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        Optional<User> result = userService.authenticateUser("nonexistent", "password123");

        assertFalse(result.isPresent());
    }

    @Test
    void getAllUsers_Success() {
        List<User> users = Arrays.asList(testUser);
        when(userRepository.findAll()).thenReturn(users);

        List<User> result = userService.getAllUsers();

        assertEquals(1, result.size());
        assertEquals("testuser", result.get(0).getUsername());
    }

    @Test
    void getTotalUsers_Success() {
        when(userRepository.count()).thenReturn(5L);

        long result = userService.getTotalUsers();

        assertEquals(5L, result);
    }

    @Test
    void getActiveUsers_Success() {
        when(userRepository.countActiveUsers()).thenReturn(3L);

        long result = userService.getActiveUsers();

        assertEquals(3L, result);
    }

    @Test
    void getUserByUsername_Success() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));

        Optional<User> result = userService.getUserByUsername("testuser");

        assertTrue(result.isPresent());
        assertEquals("testuser", result.get().getUsername());
    }

    @Test
    void updatePassword_Success() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(anyString())).thenReturn("newEncodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        boolean result = userService.updatePassword("testuser", "newPassword");

        assertTrue(result);
        verify(userRepository).save(any(User.class));
        verify(userRepository).flush();
    }

    @Test
    void updatePassword_UserNotFound() {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        boolean result = userService.updatePassword("nonexistent", "newPassword");

        assertFalse(result);
    }
}
