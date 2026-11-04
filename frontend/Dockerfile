FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build
ARG RELEASE_VERSION=development
ENV RELEASE_VERSION=$RELEASE_VERSION
LABEL org.opencontainers.image.revision=$RELEASE_VERSION
ENV NODE_ENV=production
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
