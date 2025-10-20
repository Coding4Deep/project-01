package com.example.devopsapp.controller;

import com.example.devopsapp.model.User;
import com.example.devopsapp.service.UserService;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@Controller
public class AuthController {

    @Autowired
    private UserService userService;

    @GetMapping("/login")
    public String loginPage(@RequestParam(value = "error", required = false) String error,
                            @RequestParam(value = "logout", required = false) String logout,
                            Model model) {
        if (error != null) {
            model.addAttribute("errorMsg", "Invalid username or password.");
        }
        if (logout != null) {
            model.addAttribute("msg", "You have been logged out.");
        }
        return "login";
    }

    @GetMapping("/register")
    public String registerPage(Model model) {
        model.addAttribute("user", new User());
        return "register";
    }

    @PostMapping("/register")
    public String registerUser(@ModelAttribute("user") User user, Model model) {
        Optional<User> byEmail = userService.findByEmail(user.getEmail());
        Optional<User> byUsername = userService.findByUsername(user.getUsername());

        if (byEmail.isPresent()) {
            model.addAttribute("errorMsg", "Email already registered");
            return "register";
        }

        if (byUsername.isPresent()) {
            model.addAttribute("errorMsg", "Username already taken");
            return "register";
        }

        userService.saveUser(user);
        model.addAttribute("msg", "Registration successful! Please login.");
        return "login";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model, Principal principal) {
        if (principal == null) {
            return "redirect:/login";
        }

        String email = principal.getName();
        Optional<User> userOpt = userService.findByEmail(email);

        if (userOpt.isEmpty()) {
            return "redirect:/login";
        }

        User user = userOpt.get();

        model.addAttribute("username", user.getUsername());
        model.addAttribute("email", user.getEmail());

        model.addAttribute("materials", new String[]{
                "Docker Basics",
                "Kubernetes Tutorial",
                "Jenkins CI/CD",
                "Terraform Infrastructure as Code",
                "RabbitMQ Messaging",
                "Memcached Caching"
        });

        List<User> allUsers = userService.getAllUsers();
        model.addAttribute("allUsers", allUsers);

        return "dashboard";
    }
}
