# Configuración de Azure Blob Storage

Este proyecto usa Azure Blob Storage para almacenar los códigos QR que se envían por email.

## ¿Por qué Azure Storage?

- ✅ Los QR se muestran correctamente en **todos** los clientes de email (Gmail, Outlook, Yahoo, etc.)
- ✅ Gmail bloquea data URIs embebidos, pero acepta URLs públicas
- ✅ URLs permanentes y accesibles desde cualquier dispositivo
- ✅ Cache optimizado para carga rápida

## Pasos de configuración

### 1. Crear Storage Account

1. Accede a [Azure Portal](https://portal.azure.com)
2. Busca "**Storage accounts**" → **+ Create**
3. Configuración:
   - **Nombre**: `evento5gstorage` (único globalmente)
   - **Región**: Brazil South
   - **Rendimiento**: Standard
   - **Redundancia**: LRS (más económico)
4. Clic en **Review + create** → **Create**

### 2. Obtener Connection String

1. Ve a tu Storage Account creada
2. Menú lateral → **Security + networking** → **Access keys**
3. En **key1**, haz clic en **Show** junto a "Connection string"
4. Copia la cadena completa (empieza con `DefaultEndpointsProtocol=https...`)

### 3. Configurar en Digital Ocean (o tu hosting)

1. Ve a tu App → **Settings** → **Components** → [Backend]
2. Busca **Environment Variables**
3. Agrega:
   ```
   Key: AZURE_STORAGE_CONNECTION_STRING
   Value: [Pega la connection string]
   ```
4. Guarda y reinicia la aplicación

### 4. El código crea automáticamente el contenedor

El contenedor `qr-eventos` se crea automáticamente la primera vez que se sube un QR.
Se configura con acceso público de tipo "Blob" (solo lectura).

## Costos estimados

Para 1,000 asistentes (~500 KB por QR):
- **Almacenamiento**: ~$0.01 USD/mes
- **Operaciones**: Primeras 10,000 gratis
- **Transferencia**: Incluida

**Prácticamente gratis** 🎉

## Seguridad

⚠️ **IMPORTANTE**: 
- NO compartas tu Connection String públicamente
- NO la subas a GitHub (ya está en `.gitignore`)
- Usa variables de entorno siempre

## Verificación

Para verificar que funciona:
1. Registra un asistente de prueba
2. Envía el email
3. Abre el email en Gmail (móvil o web)
4. El QR debe mostrarse perfectamente en el cuerpo del email

## Solución de problemas

### Error: "AZURE_STORAGE_CONNECTION_STRING no está configurado"
- Verifica que la variable de entorno esté configurada en Digital Ocean
- Reinicia la aplicación después de agregar la variable

### Error: "Container not found"
- El contenedor se crea automáticamente
- Si persiste, créalo manualmente en Azure Portal con acceso "Blob"

### El QR no se muestra en el email
- Verifica que el contenedor tenga acceso público tipo "Blob"
- Prueba abrir la URL del QR directamente en el navegador
