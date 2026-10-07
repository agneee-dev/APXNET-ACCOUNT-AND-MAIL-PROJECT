FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3103
# DEV mode on purpose — instant UI refresh on file change (per request, no `next build`)
CMD ["npm", "run", "dev"]
