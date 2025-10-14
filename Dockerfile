# ---------- Build Stage ----------
ARG MVN_VERSION=3.9.9
ARG JAVA_VERSION=17

FROM maven:${MVN_VERSION}-eclipse-temurin-${JAVA_VERSION}-alpine AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# ---------- Runtime Stage ----------
FROM eclipse-temurin:${JAVA_VERSION}-jre-alpine

# Install curl and tini (for healthcheck and proper signal handling)
RUN apk add --no-cache curl  && \  
    rm -rf /var/cache/apk/* /tmp/* 

WORKDIR /app

# Labels (metadata)
LABEL org.opencontainers.image.title="My Java Application" \
      org.opencontainers.image.description="A sample Java application running in a Docker container" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="sagardeepak2002@gmail.com" \
      org.opencontainers.image.licenses="MIT"

# Add non-root user for security
ARG USER_ID=1001
ARG GROUP_ID=1001
ARG USER_NAME=appuser
ARG GROUP_NAME=appgroup

RUN addgroup -g ${GROUP_ID} ${GROUP_NAME} && \
    adduser -S -u ${USER_ID} -G ${GROUP_NAME} ${USER_NAME}

# Copy app from builder
COPY --from=build --chown=${USER_NAME}:${GROUP_NAME} /app/target/*.war app.war

USER ${USER_NAME}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Expose app port
EXPOSE 8080

# Set JVM memory options
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"

# Proper entrypoint (use sh -c to expand JAVA_OPTS)
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.war"]
