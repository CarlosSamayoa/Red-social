import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

function FaceDetection({ imageFile, onFacesDetected }) {
  const canvasRef = useRef();
  const imgRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setModelLoadingProgress(10);
        const MODEL_URL = '/models';
        
        // Cargar modelos progresivamente
        console.log('🤖 Cargando modelos de face-api.js...');
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelLoadingProgress(30);
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoadingProgress(50);
        
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelLoadingProgress(70);
        
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setModelLoadingProgress(85);
        
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
        setModelLoadingProgress(100);
        
        console.log('✅ Todos los modelos cargados exitosamente');
        setModelsLoaded(true);
      } catch (error) {
        console.warn('⚠️ Modelos de detección facial no disponibles:', error);
        console.log('💡 La aplicación continuará sin reconocimiento facial automático');
        setModelsLoaded(false);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (imageFile && modelsLoaded) {
      detectFaces();
    }
  }, [imageFile, modelsLoaded]);

  const detectFaces = async () => {
    if (!imgRef.current || !modelsLoaded) return;

    setLoading(true);
    try {
      console.log('🔍 Iniciando análisis facial...');
      
      // Detectar caras con todas las características
      const detections = await faceapi
        .detectAllFaces(imgRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      setFaces(detections);
      
      // Análisis avanzado de los resultados
      const analysisData = analyzeDetections(detections);
      setAnalysisResults(analysisData);
      
      console.log(`✅ Análisis completado: ${detections.length} cara(s) detectada(s)`);
      
      // Callback con información detallada
      if (onFacesDetected) {
        onFacesDetected(detections.map((detection, index) => ({
          id: index + 1,
          confidence: detection.detection.score,
          box: {
            x: Math.round(detection.detection.box.x),
            y: Math.round(detection.detection.box.y),
            width: Math.round(detection.detection.box.width),
            height: Math.round(detection.detection.box.height)
          },
          landmarks: detection.landmarks?.positions || [],
          expressions: detection.expressions || {},
          dominantExpression: getDominantExpression(detection.expressions || {}),
          age: Math.round(detection.age) || null,
          gender: detection.gender || null,
          genderProbability: Math.round((detection.genderProbability || 0) * 100),
          faceSize: Math.round(detection.detection.box.width * detection.detection.box.height),
          relativeSize: getRelativeFaceSize(detection.detection.box, imgRef.current)
        })));
      }

      // Dibujar visualización mejorada
      drawEnhancedDetections(detections);
      
    } catch (error) {
      console.error('❌ Error en detección facial:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeDetections = (detections) => {
    if (!detections || detections.length === 0) return null;
    
    const ages = detections.map(d => d.age).filter(age => age);
    const expressions = detections.map(d => getDominantExpression(d.expressions || {}));
    const genders = detections.map(d => d.gender).filter(g => g);
    
    return {
      totalFaces: detections.length,
      averageAge: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
      ageRange: ages.length > 0 ? { min: Math.min(...ages), max: Math.max(...ages) } : null,
      dominantExpressions: [...new Set(expressions)],
      genderDistribution: {
        male: genders.filter(g => g === 'male').length,
        female: genders.filter(g => g === 'female').length
      },
      averageConfidence: Math.round(detections.reduce((sum, d) => sum + d.detection.score, 0) / detections.length * 100),
      faceSizes: detections.map(d => Math.round(d.detection.box.width * d.detection.box.height))
    };
  };

  const getDominantExpression = (expressions) => {
    if (!expressions || Object.keys(expressions).length === 0) return 'neutral';
    return Object.entries(expressions).reduce((a, b) => expressions[a[0]] > expressions[b[0]] ? a : b)[0];
  };

  const getRelativeFaceSize = (box, imgElement) => {
    if (!imgElement) return 'unknown';
    const faceArea = box.width * box.height;
    const imageArea = imgElement.offsetWidth * imgElement.offsetHeight;
    const ratio = faceArea / imageArea;
    
    if (ratio > 0.3) return 'large';
    if (ratio > 0.1) return 'medium';
    return 'small';
  };

  const drawEnhancedDetections = (detections) => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const displaySize = { 
      width: imgRef.current.offsetWidth, 
      height: imgRef.current.offsetHeight 
    };
    
    faceapi.matchDimensions(canvas, displaySize);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar detecciones básicas
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    
    // Información mejorada para cada cara
    resizedDetections.forEach((detection, i) => {
      const { age, gender, genderProbability, expressions } = detection;
      const box = detection.detection.box;
      const dominantExpression = getDominantExpression(expressions);
      const confidence = Math.round(detection.detection.score * 100);
      
      // Estilo de texto
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 12px Arial';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      
      // Información principal
      const info = `👤 ${gender} (${Math.round(genderProbability * 100)}%)`;
      const ageInfo = `📅 ${Math.round(age)} años`;
      const expressionInfo = `😊 ${dominantExpression} (${Math.round(expressions[dominantExpression] * 100)}%)`;
      const confidenceInfo = `🎯 ${confidence}%`;
      
      // Dibujar texto con contorno
      const y = box.y - 10;
      [info, ageInfo, expressionInfo, confidenceInfo].forEach((text, index) => {
        const textY = y - (index * 15);
        ctx.strokeText(text, box.x, textY);
        ctx.fillText(text, box.x, textY);
      });
      
      // Número de cara
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 16px Arial';
      ctx.fillRect(box.x + box.width - 25, box.y, 25, 25);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${i + 1}`, box.x + box.width - 18, box.y + 17);
    });
  };

  const handleImageLoad = () => {
    if (modelsLoaded) {
      detectFaces();
    }
  };

  if (!imageFile) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <img
        ref={imgRef}
        src={URL.createObjectURL(imageFile)}
        alt="Face detection analysis"
        onLoad={handleImageLoad}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
      />
      
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          borderRadius: '8px'
        }}
      />
      
      {!modelsLoaded && modelLoadingProgress < 100 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>🤖 Cargando modelos de IA...</div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            {modelLoadingProgress}%
          </div>
        </div>
      )}
      
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>🔍 Analizando caras...</div>
          <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
            Detectando características faciales
          </div>
        </div>
      )}
      
      {/* Resultados del análisis */}
      {modelsLoaded && analysisResults && (
        <div style={{ 
          marginTop: '16px', 
          padding: '16px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '8px',
          border: '1px solid #ddd',
          fontSize: '14px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>
            📊 Análisis de Reconocimiento Facial
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <strong>👥 Caras detectadas:</strong> {analysisResults.totalFaces}
            </div>
            
            {analysisResults.averageAge && (
              <div>
                <strong>📅 Edad promedio:</strong> {analysisResults.averageAge} años
              </div>
            )}
            
            {analysisResults.averageConfidence && (
              <div>
                <strong>🎯 Confianza promedio:</strong> {analysisResults.averageConfidence}%
              </div>
            )}
            
            {analysisResults.dominantExpressions.length > 0 && (
              <div>
                <strong>😊 Expresiones:</strong> {analysisResults.dominantExpressions.join(', ')}
              </div>
            )}
          </div>
          
          {analysisResults.genderDistribution && (
            <div style={{ marginTop: '12px' }}>
              <strong>⚥ Distribución:</strong>{' '}
              {analysisResults.genderDistribution.male > 0 && `${analysisResults.genderDistribution.male} masculino(s) `}
              {analysisResults.genderDistribution.female > 0 && `${analysisResults.genderDistribution.female} femenino(s)`}
            </div>
          )}
        </div>
      )}
      
      {!modelsLoaded && modelLoadingProgress >= 100 && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px',
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          fontSize: '12px', 
          color: '#856404'
        }}>
          ⚠️ Reconocimiento facial no disponible (función opcional)
        </div>
      )}
    </div>
  );
}

export default FaceDetection;
