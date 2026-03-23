FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts dependency-cruiser.cjs ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm -r build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN corepack enable

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/adapters/package.json /app/packages/adapters/package.json
COPY --from=build /app/packages/core/package.json /app/packages/core/package.json
COPY --from=build /app/packages/adapters/dist /app/packages/adapters/dist
COPY --from=build /app/packages/core/dist /app/packages/core/dist

RUN pnpm install --prod --frozen-lockfile

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["pnpm", "--filter", "@in-the-loop/adapters", "start"]
