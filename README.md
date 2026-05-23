# PIMT ERP System
**Pailan Institute of Management & Technology — Enterprise Resource Planning**
Built by **Globlyn Solutions**

---

## 🗂️ Project Structure

```
pimt-erp/
├── backend/          # Node.js + Express REST API
└── frontend/         # Next.js 14 Web App (3 Panels)
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB Atlas account (free M0 tier)
- Cloudflare R2 bucket

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Edit `.env` with your real values:
```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/pimt_erp
JWT_SECRET=your_super_secret_key_here
FRONTEND_URL=http://localhost:3000

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=pimt-erp-files
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

SMTP_HOST=smtp.zoho.in
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.in
SMTP_PASS=your_zoho_password
SMTP_FROM=PIMT ERP <noreply@yourdomain.in>

UPI_ID=pimt@upi
UPI_NAME=Pailan Institute of Management & Technology
```

Seed the database (creates admin + sample accounts):
```bash
node seed.js
```

Start the server:
```bash
npm run dev        # development (nodemon)
npm start          # production
```

Server runs on: `http://localhost:5000`

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start dev server:
```bash
npm run dev
```

App runs on: `http://localhost:3000`

---

## 🔐 Default Login Credentials (after seed)

| Role       | Email                        | Password      |
|------------|------------------------------|---------------|
| Admin      | admin@pimt.edu.in            | Admin@1234    |
| Teacher    | teacher@pimt.edu.in          | Teacher@123   |
| Consultant | consultant@pimt.edu.in       | Consult@123   |
| Student    | Register at `/register`      | (self-set)    |

> ⚠️ **Change all default passwords immediately after first login!**

---

## 🌐 Panel Access URLs

| Panel      | URL Path         | Role Required      |
|------------|------------------|--------------------|
| Admin      | `/admin`         | admin              |
| Sub-Admin  | `/sub-admin`     | teacher/consultant |
| Student    | `/student`       | student            |
| Login      | `/login`         | all                |
| Register   | `/register`      | new students       |

---

## 📦 Full Feature List

### Admin Panel
- [x] Dashboard with stats (students, teachers, fees, leaves)
- [x] Create / deactivate sub-admin accounts (teacher + consultant)
- [x] View / deactivate student records
- [x] Fee management — create invoices, mark paid, generate receipts
- [x] UPI QR code generation for fee payment
- [x] Attendance — view per student + bulk mark
- [x] Notice board — post, pin, delete notices
- [x] Study materials — upload PDFs to Cloudflare R2
- [x] Leave management — approve / reject with notes
- [x] Salary & payroll — create records, mark paid, generate salary slip PDF
- [x] CRM Leads — view all leads across all staff

### Sub-Admin Panel (Teacher + Consultant)
- [x] Dashboard with personal stats
- [x] Own CRM leads — add, update status, follow-up dates
- [x] Post notices (with admin permission)
- [x] Upload study materials for students
- [x] Apply for leave, view own leave history
- [x] Download own monthly salary slips (PDF)

### Student Panel
- [x] Self-registration with email
- [x] Dashboard with attendance %, pending fees overview
- [x] Fee history — pending / paid invoices
- [x] UPI QR payment for pending fees
- [x] Download fee receipt (PDF) when paid
- [x] Attendance % with circular chart + full records
- [x] Notice board (read-only)
- [x] Study materials — download PDFs (subject-grouped)
- [x] Digital I-Card preview + PDF download

---

## 🚀 Production Deployment (DigitalOcean)

### Server Setup (Ubuntu 22.04, 2GB RAM)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Deploy Backend

```bash
# Clone or upload your code to /var/www/pimt-erp
cd /var/www/pimt-erp/backend
npm install --production

# Set environment variables
cp .env.example .env
nano .env   # fill in all values

# Seed the DB
node seed.js

# Start with PM2
pm2 start server.js --name pimt-backend
pm2 startup
pm2 save
```

### Deploy Frontend

```bash
cd /var/www/pimt-erp/frontend

# Set production API URL
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.in/api" > .env.local

npm install
npm run build

# Start with PM2
pm2 start npm --name pimt-frontend -- start
pm2 save
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/pimt-erp

# Frontend
server {
    server_name yourdomain.in www.yourdomain.in;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    server_name api.yourdomain.in;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pimt-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.in -d www.yourdomain.in -d api.yourdomain.in
```

---

## 🛠️ API Reference (Quick)

| Method | Endpoint                        | Role     | Description               |
|--------|---------------------------------|----------|---------------------------|
| POST   | /api/auth/login                 | all      | Login                     |
| POST   | /api/auth/register              | public   | Student self-registration |
| GET    | /api/admin/dashboard            | admin    | Dashboard stats           |
| POST   | /api/admin/sub-admins           | admin    | Create teacher/consultant |
| GET    | /api/admin/students             | admin    | All students              |
| GET    | /api/fees                       | admin    | All fee records           |
| POST   | /api/fees                       | admin    | Create fee                |
| PATCH  | /api/fees/:id/mark-paid         | admin    | Mark fee paid + receipt   |
| GET    | /api/fees/qr/:studentId         | any      | UPI QR for student        |
| GET    | /api/fees/my                    | student  | Own fees                  |
| POST   | /api/attendance/mark            | teacher  | Bulk mark attendance      |
| GET    | /api/attendance/my              | student  | Own attendance %          |
| GET    | /api/notices                    | all      | All notices               |
| POST   | /api/notices                    | admin    | Post notice               |
| GET    | /api/materials/my               | student  | Own materials             |
| POST   | /api/materials                  | teacher  | Upload material           |
| POST   | /api/leaves/apply               | teacher  | Apply leave               |
| PATCH  | /api/leaves/:id/review          | admin    | Approve/reject            |
| GET    | /api/salary/my                  | teacher  | Own salary slips          |
| POST   | /api/salary/:id/pay             | admin    | Pay salary + generate PDF |
| GET    | /api/student/icard              | student  | Download I-Card PDF       |
| GET    | /api/leads                      | staff    | CRM leads (role-filtered) |

---

## 📁 Technology Stack

| Layer      | Technology          | Purpose                          |
|------------|---------------------|----------------------------------|
| Frontend   | Next.js 14 (React)  | Web UI — all 3 panels            |
| Styling    | Tailwind CSS        | Utility-first design             |
| Backend    | Node.js + Express   | REST API                         |
| Database   | MongoDB Atlas M0    | Data storage (free tier)         |
| File Store | Cloudflare R2       | PDF storage (salary, receipts)   |
| Auth       | JWT (jsonwebtoken)  | Stateless authentication         |
| PDF        | PDFKit              | Receipt, salary slip, I-Card     |
| QR Code    | qrcode npm          | UPI payment QR generation        |
| Email      | Nodemailer + Zoho   | Fee receipts, welcome emails     |
| Hosting    | DigitalOcean Droplet| 2GB RAM production server        |
| SSL        | Let's Encrypt       | Free HTTPS                       |

---

## 📞 Support
Built by **Globlyn Solutions** · Kolkata
30-day post-launch bug support included.#   p i m t - b a c k e n d  
 