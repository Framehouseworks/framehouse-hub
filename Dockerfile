# Stage 1: Base image with shared configurations
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Install dependencies
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy lockfiles and package definitions
COPY package.json package-lock.json ./

# Install dependencies using --legacy-peer-deps
RUN npm ci --legacy-peer-deps

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app

# Accept build-time variables (Next.js requires these to be baked in during build)
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

# Sanity check: Fail the build if critical variables are missing to prevent "undefined" URLs
RUN if [ -z "$NEXT_PUBLIC_SERVER_URL" ]; then \
    echo "ERROR: NEXT_PUBLIC_SERVER_URL is not set. This variable is required for building the client-side bundle."; \
    exit 1; \
    fi

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists (handles cases where it might be empty/ignored)
RUN mkdir -p public

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install tini for signal handling
RUN apk add --no-cache tini

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
