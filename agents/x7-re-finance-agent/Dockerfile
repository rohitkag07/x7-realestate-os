FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8088 NODE_ENV=production
EXPOSE 8088
CMD ["node", "index.js"]
