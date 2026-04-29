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

# Install dependencies using --legacy-peer-deps for compatibility
RUN npm ci --legacy-peer-deps

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app

# Accept build-time variables
ARG NEXT_PUBLIC_SERVER_URL
ARG GCS_BUCKET
ARG GCS_PROJECT_ID

# Set build-time environment
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV GCS_BUCKET=${GCS_BUCKET:-stub_bucket_for_importmap}
ENV GCS_PROJECT_ID=$GCS_PROJECT_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV IS_BUILD_PHASE=true
ENV NODE_ENV=production

# Sanity check: Fail early if critical variables are missing
RUN if [ -z "$NEXT_PUBLIC_SERVER_URL" ]; then \
    echo "ERROR: NEXT_PUBLIC_SERVER_URL is not set. Required for client-side bundle."; \
    exit 1; \
    fi

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists for static generation
RUN mkdir -p public

# Generate the importMap and Build the application
# We use localized secret stubs to prevent exposure in the image metadata
RUN PAYLOAD_SECRET=build_time_only_secret DATABASE_URI=postgres://localhost/mock_build_db npx payload generate:importmap && \
    PAYLOAD_SECRET=build_time_only_secret DATABASE_URI=postgres://localhost/mock_build_db npm run build

# Stage 4: Production runner
# We use a clean base to ensure 'Standalone Purity'
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install tini for superior signal handling
RUN apk add --no-cache tini

# Create a non-root user for security hardening
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy ONLY the required standalone build and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Enterprise Hardening: Explicitly prune non-runtime files that may be 
# over-collected by the standalone tracer (e.g. src, package.json).
# This ensures a 'Zero-Source' production image.
RUN rm -rf src package.json package-lock.json

# Switch to the non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# ENTRYPOINT ensures tini catches all termination signals correctly
ENTRYPOINT ["/sbin/tini", "--"]

# server.js is the entry point for the Next.js standalone build
CMD ["node", "server.js"]
