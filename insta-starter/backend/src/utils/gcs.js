const { Storage } = require('@google-cloud/storage');

// Inicializar Cloud Storage
// En Cloud Run, las credenciales se cargan automáticamente
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET || 'red-o-images-prod';

/**
 * Subir archivo a Cloud Storage
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} destination - Ruta de destino en el bucket
 * @param {string} contentType - Tipo MIME del archivo
 * @returns {Promise<string>} URL pública del archivo
 */
async function uploadToGCS(fileBuffer, destination, contentType) {
  try {
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(destination);
    
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('Error uploading to GCS:', err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        try {
          // Hacer el archivo público
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      });

      blobStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Error in uploadToGCS:', error);
    throw error;
  }
}

/**
 * Eliminar archivo de Cloud Storage
 * @param {string} destination - Ruta del archivo en el bucket
 */
async function deleteFromGCS(destination) {
  try {
    const bucket = storage.bucket(bucketName);
    await bucket.file(destination).delete();
    console.log(`File ${destination} deleted from GCS`);
  } catch (error) {
    console.error('Error deleting from GCS:', error);
    throw error;
  }
}

/**
 * Verificar si un archivo existe en GCS
 * @param {string} destination - Ruta del archivo en el bucket
 * @returns {Promise<boolean>}
 */
async function fileExistsInGCS(destination) {
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.file(destination).exists();
    return exists;
  } catch (error) {
    console.error('Error checking file existence in GCS:', error);
    return false;
  }
}

/**
 * Obtener URL pública de un archivo
 * @param {string} destination - Ruta del archivo en el bucket
 * @returns {string} URL pública
 */
function getPublicUrl(destination) {
  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

module.exports = {
  uploadToGCS,
  deleteFromGCS,
  fileExistsInGCS,
  getPublicUrl,
  bucketName,
  storage
};
