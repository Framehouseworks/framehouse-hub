# Stage 1: Base image with shared configurations
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Install dependencies
FROM base AS deps
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
ARG GCS_BUCKET
ARG GCS_PROJECT_ID

# Set build-time environment (Non-sensitive)
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV GCS_BUCKET=${GCS_BUCKET:-stub_bucket_for_importmap}
ENV GCS_PROJECT_ID=$GCS_PROJECT_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV IS_BUILD_PHASE=true

# Sanity check: Fail the build if critical variables are missing
RUN if [ -z "$NEXT_PUBLIC_SERVER_URL" ]; then \
    echo "ERROR: NEXT_PUBLIC_SERVER_URL is not set. This variable is required for building the client-side bundle."; \
    exit 1; \
    fi

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Generate the importMap and Build the application
# We use inline environment variables for sensitive stubs to prevent them from being baked into the final image layers
RUN PAYLOAD_SECRET=build_time_only_secret DATABASE_URI=postgres://localhost/mock_build_db npx payload generate:importmap
RUN PAYLOAD_SECRET=build_time_only_secret DATABASE_URI=postgres://localhost/mock_build_db npm run build

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
