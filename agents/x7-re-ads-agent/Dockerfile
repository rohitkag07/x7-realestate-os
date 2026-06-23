FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8085 NODE_ENV=production
EXPOSE 8085
CMD ["node", "index.js"]
