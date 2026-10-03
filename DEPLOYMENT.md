# 🚀 Guía de Despliegue en Producción — TiendaDelki

Esta guía detalla los requerimientos, pasos de instalación, configuración de proxy inverso (Nginx), certificados SSL/TLS, variables de entorno y mantenimiento para desplegar **TiendaDelki** en un servidor de producción de forma robusta, segura y preparada para mantenerse en línea durante años.

---

## 1. Requisitos del Sistema

### 1.1 Especificaciones de Hardware Mínimas y Recomendadas
| Recurso | Mínimo (Tráfico bajo/medio) | Recomendado (Tráfico alto / Concurrencia) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 2 GB (con 2 GB swap) | 4 GB - 8 GB |
| **Disco** | 20 GB SSD NVMe | 50+ GB SSD NVMe con volumen persistente |
| **Red** | 100 Mbps simétricos | 1 Gbps |

### 1.2 Software Base
- **Sistema Operativo:** Ubuntu 22.04 LTS / 24.04 LTS o Debian 12.
- **Node.js:** Versión 20 LTS o 22 LTS (`node -v`).
- **Gestor de Paquetes:** npm 10+ (incluido con Node.js).
- **Base de Datos:** PostgreSQL 15 o 16 con extensión `pgcrypto` activada.
- **Servidor Web / Reverse Proxy:** Nginx 1.20+.
- **Administrador de Procesos:** PM2 (`npm install -g pm2`) o `systemd`.
- **SSL / TLS:** Certbot (`snap install --classic certbot`).

---

## 2. Preparación del Servidor (Ubuntu / Debian)

### 2.1 Actualización del Sistema y Paquetes Esenciales
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential
```

### 2.2 Configuración del Firewall (UFW)
Asegurar el servidor permitiendo solo SSH, HTTP y HTTPS:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh          # Si usas puerto personalizado, p.ej. ufw allow 2222/tcp
sudo ufw allow 80/tcp       # HTTP (para Certbot y redirección)
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable
sudo ufw status
```

### 2.3 Instalación de Node.js (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Debe mostrar v20.x.x
npm -v  # Debe mostrar v10.x.x
```

### 2.4 Instalación de PostgreSQL 16
```bash
sudo apt install -y postgresql postgresql-contrib

# Iniciar y habilitar servicio
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Crear base de datos y usuario dedicado
sudo -u postgres psql -c "CREATE USER tiendadelki_user WITH PASSWORD 'TU_CONTRASEÑA_SUPER_SEGURA';"
sudo -u postgres psql -c "CREATE DATABASE tiendadelki_prod OWNER tiendadelki_user;"
sudo -u postgres psql -d tiendadelki_prod -c "GRANT ALL PRIVILEGES ON DATABASE tiendadelki_prod TO tiendadelki_user;"
sudo -u postgres psql -d tiendadelki_prod -c "GRANT ALL ON SCHEMA public TO tiendadelki_user;"
```

---

## 3. Despliegue de la Aplicación

### 3.1 Clonación del Repositorio
Se recomienda crear un usuario de sistema no privilegiado para ejecutar la aplicación (ej. `deploy` o `tiendadelki`):
```bash
sudo adduser --disabled-password --gecos "" tiendadelki
sudo mkdir -p /var/www/tiendadelki
sudo chown -R tiendadelki:tiendadelki /var/www/tiendadelki
sudo -u tiendadelki git clone <URL_DEL_REPOSITORIO> /var/www/tiendadelki
cd /var/www/tiendadelki
```

### 3.2 Configuración de Variables de Entorno (`.env`)
Copiar la plantilla de producción y definir secretos de alta entropía (generados con `openssl rand -hex 32`):
```bash
sudo -u tiendadelki cp .env.example .env
sudo -u tiendadelki nano .env
```

Asegurarse de configurar los siguientes parámetros estrictos:
```ini
NODE_ENV="production"
PORT=3000
HOSTNAME="0.0.0.0"

# Base de datos con usuario dedicado
DATABASE_URL="postgresql://tiendadelki_user:TU_CONTRASEÑA_SUPER_SEGURA@localhost:5432/tiendadelki_prod?schema=public"

# Secretos criptográficos (Mínimo 32 caracteres generados aleatoriamente)
JWT_SECRET="ejemplo_d0e4a7b8c9f1a2e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7"
SESSION_SECRET="ejemplo_8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e"

# Dominio público y orígenes permitidos (CORS)
NEXT_PUBLIC_APP_URL="https://mitienda.com"
ALLOWED_ORIGINS="https://mitienda.com,https://www.mitienda.com"

# Almacenamiento: local persistente o S3/R2
STORAGE_PROVIDER="local"
UPLOAD_DIR="./public/uploads"
PRIVATE_STORAGE_DIR="./storage/private"
```

> [!IMPORTANT]
> En modo `production`, el archivo `src/config/env.ts` valida y aborta inmediatamente el inicio si `JWT_SECRET` o `SESSION_SECRET` contienen valores por defecto inseguros o si `NEXT_PUBLIC_APP_URL` no utiliza el protocolo `https://`.

### 3.3 Creación de Carpetas de Almacenamiento Persistente
```bash
sudo -u tiendadelki mkdir -p /var/www/tiendadelki/public/uploads
sudo -u tiendadelki mkdir -p /var/www/tiendadelki/storage/private
sudo -u tiendadelki mkdir -p /var/www/tiendadelki/storage/backups

# Permisos seguros: el usuario de la app escribe, nadie más tiene lectura fuera del grupo
chmod 750 /var/www/tiendadelki/storage/private
chmod 750 /var/www/tiendadelki/storage/backups
chmod 755 /var/www/tiendadelki/public/uploads
```

### 3.4 Instalación de Dependencias y Compilación
```bash
cd /var/www/tiendadelki
sudo -u tiendadelki npm ci
sudo -u tiendadelki npx prisma generate
sudo -u tiendadelki npm run build
```

### 3.5 Ejecución de Migraciones de Base de Datos
En producción **nunca** uses `prisma db push` ni `prisma migrate dev`. Ejecuta siempre el comando seguro de despliegue:
```bash
sudo -u tiendadelki npm run db:migrate:prod
```
*(Este comando ejecuta internamente `prisma migrate deploy`, aplicando únicamente las migraciones históricas versionadas de forma atómica y sin modificar esquemas destructivamente).*

### 3.6 Sembrado Inicial (Solo primer despliegue)
Para inicializar categorías base, tienda principal y el usuario Administrador:
```bash
sudo -u tiendadelki npm run db:seed
```
*(Cambie inmediatamente la contraseña del administrador tras iniciar sesión por primera vez).*

---

## 4. Gestión de Procesos con PM2

PM2 garantiza que la aplicación se mantenga activa 24/7, se reinicie automáticamente ante fallos o reinicios del servidor, y distribuya la carga entre los núcleos de CPU.

### 4.1 Instalación de PM2
```bash
sudo npm install -g pm2
```

### 4.2 Archivo de Configuración `ecosystem.config.cjs`
Crear el archivo en la raíz del proyecto `/var/www/tiendadelki/ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: "tiendadelki",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/tiendadelki",
      instances: "max",       // Modo cluster utilizando todos los vCPUs disponibles
      exec_mode: "cluster",
      max_memory_restart: "750M", // Reiniciar workers si hay una fuga de memoria imprevista
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/tiendadelki/error.log",
      out_file: "/var/log/tiendadelki/out.log",
      merge_logs: true,
      autorestart: true,
      restart_delay: 4000,
    },
  ],
};
```

Crear el directorio de logs del sistema:
```bash
sudo mkdir -p /var/log/tiendadelki
sudo chown -R tiendadelki:tiendadelki /var/log/tiendadelki
```

### 4.3 Iniciar la Aplicación y Configurar Arranque Automático (Boot Startup)
```bash
sudo -u tiendadelki pm2 start ecosystem.config.cjs
sudo -u tiendadelki pm2 save

# Configurar hook de systemd para que inicie automáticamente al bootear el servidor
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u tiendadelki --hp /home/tiendadelki
```

---

## 5. Configuración de Dominio y Reverse Proxy con Nginx

### 5.1 Configuración DNS
En tu registrador de dominio (ej. Cloudflare, Namecheap, Route53), configura los registros:
- **Registro A:** `@` apunta a la IP pública del servidor (ej. `203.0.113.10`).
- **Registro A (o CNAME):** `www` apunta a `@` o a la IP del servidor.

### 5.2 Configuración de Nginx
Crea el archivo `/etc/nginx/sites-available/tiendadelki`:
```nginx
# Rate limiting para mitigar abusos de fuerza bruta y denegación de servicio (DoS)
limit_req_zone $binary_remote_addr zone=tienda_limit:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    listen [::]:80;
    server_name mitienda.com www.mitienda.com;

    # Permitir challenge de Certbot ACME
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirigir todo el tráfico HTTP a HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mitienda.com www.mitienda.com;

    # Certificados SSL (Gestionados por Certbot)
    ssl_certificate /etc/letsencrypt/live/mitienda.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mitienda.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Límite máximo de subida para comprobantes e imágenes (10 MB)
    client_max_body_size 10M;

    # Compresión Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Archivos estáticos de Next.js con caché inmutable
    location /_next/static/ {
        alias /var/www/tiendadelki/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Directorio público de uploads de productos
    location /uploads/ {
        alias /var/www/tiendadelki/public/uploads/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000";
        # Prevenir ejecución de scripts en carpeta de uploads
        location ~ \.(php|pl|py|jsp|sh|cgi|exe)$ {
            deny all;
        }
    }

    # Proteger endpoints de API con rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Proxy a Next.js para todas las demás rutas
    location / {
        limit_req zone=tienda_limit burst=40 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

### 5.3 Obtención del Certificado SSL con Certbot
```bash
# Habilitar sitio en Nginx
sudo ln -s /etc/nginx/sites-available/tiendadelki /etc/nginx/sites-enabled/
sudo nginx -t

# Obtener certificado automáticamente
sudo certbot --nginx -d mitienda.com -d www.mitienda.com

# Probar renovación automática
sudo certbot renew --dry-run
```

---

## 6. Procedimiento de Actualización sin Caída (Zero-Downtime Deploy)

Para desplegar nuevas versiones del código en producción sin interrumpir el servicio:

```bash
#!/bin/bash
set -e

cd /var/www/tiendadelki

echo "1. Descargando última versión de Git..."
git pull origin main

echo "2. Instalando dependencias de producción..."
npm ci

echo "3. Generando cliente Prisma..."
npx prisma generate

echo "4. Aplicando migraciones de base de datos..."
npm run db:migrate:prod

echo "5. Compilando aplicación Next.js..."
npm run build

echo "6. Recargando cluster PM2 con Zero-Downtime..."
pm2 reload ecosystem.config.cjs --update-env

echo "7. Verificando estado del servicio..."
curl -s -f http://127.0.0.1:3000/api/health | grep '"status":"healthy"' && echo "✅ Despliegue completado con éxito!" || echo "❌ ALERTA: Verificación de salud fallida."
```

Guarde este script como `/var/www/tiendadelki/deploy.sh` con permisos de ejecución (`chmod +x deploy.sh`).
