# PantheonMed AI — Frontend Dockerfile (Railway)
#
# Railway config: Root Directory = pantheonmed-ai-frontend
# (Build context = frontend folder, so COPY paths have no prefix)

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
