# Multi-stage build
FROM maven:3.9.4-openjdk-17-slim AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM tomcat:10.1-jre17-temurin-jammy
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN rm -rf /usr/local/tomcat/webapps/*
COPY --from=builder /app/target/*.war /usr/local/tomcat/webapps/monitoring.war
RUN chown -R appuser:appuser /usr/local/tomcat
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/monitoring/health || exit 1
CMD ["catalina.sh", "run"]
