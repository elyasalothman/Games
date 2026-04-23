# استخدام نسخة حديثة وخفيفة من Node.js
FROM node:18-alpine

# تعيين مسار العمل داخل الحاوية
WORKDIR /usr/src/app

# نسخ ملفات الاعتماديات وتثبيتها أولاً
COPY package*.json ./
RUN npm install --only=production

# نسخ باقي ملفات المشروع (بما في ذلك index.html و server.js)
COPY . .

# فتح المنفذ الذي يستخدمه الخادم
EXPOSE 3000

# أمر التشغيل عند بدء الحاوية
CMD ["npm", "start"]