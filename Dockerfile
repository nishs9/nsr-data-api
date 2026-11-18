FROM node:22-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p db && chown node:node db
EXPOSE 3000

# Start the app
USER node
CMD ["npm", "start"]