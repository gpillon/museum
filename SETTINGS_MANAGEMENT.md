# Settings Management System

## Overview

Il sistema di gestione settings è stato completamente rinnovato per fornire un controllo dinamico e intelligente sui parametri del modello YOLO.

## Nuove Funzionalità

### 1. Endpoint GET `/api/settings`
- **Scopo**: Recupera i settings attuali del modello
- **Risposta**: Settings correnti con valori effettivi
- **Utilizzo**: Frontend carica automaticamente i settings all'apertura del modal

### 2. Endpoint GET `/api/settings/available`
- **Scopo**: Fornisce informazioni sui settings disponibili e le loro constraints
- **Risposta**: Schema completo dei settings con opzioni e capacità
- **Utilizzo**: Frontend adatta l'interfaccia in base alle capacità del sistema

### 3. Device Management
- **Rilevamento Automatico**: CUDA, MPS, CPU
- **Capacità Dinamiche**: Half precision, memoria, performance
- **Validazione**: Solo device disponibili sono selezionabili

### 4. Model Management ⭐ **NUOVO**
- **Rilevamento Automatico**: Modelli YOLO disponibili nella cartella models/
- **Informazioni Dettagliate**: Dimensione, performance, descrizione
- **Reload Automatico**: Il modello viene ricaricato quando cambiato
- **Validazione**: Solo modelli disponibili sono selezionabili
- **Refresh Automatico**: ⭐ **NUOVO** - Informazioni modelli aggiornate dopo salvataggio

## Struttura Backend

### DeviceManager (`backend/app/models/device_manager.py`)
```python
class DeviceManager:
    - detect_available_devices()
    - detect_available_models()  # NUOVO
    - get_device_capabilities()
    - get_model_info()          # NUOVO
    - validate_device_setting()
    - validate_model_setting()  # NUOVO
    - get_optimal_settings()
```

### YOLODetector Enhanced
```python
class YOLODetector:
    - get_current_settings()
    - get_available_settings()
    - update_settings() # Validazione migliorata con supporto modelli
    - reset_settings() # Reset ottimale
    - _recreate_model() # Reload quando modello cambia
```

## Struttura Frontend

### SettingsModal Enhanced
- **Caricamento Automatico**: Settings dal backend all'apertura
- **Device Dinamici**: Solo device disponibili mostrati
- **Model Selection**: ⭐ **NUOVO** - Selezione modello con informazioni dettagliate
- **Validazione UI**: Opzioni disabilitate se non disponibili
- **Half Precision**: Abilitata solo per device supportati

## API Endpoints

### GET `/api/settings`
```json
{
  "success": true,
  "settings": {
    "model": "yolo11n-pose.pt",
    "confidence": 0.25,
    "iou_threshold": 0.45,
    "max_det": 300,
    "device": "cuda",
    "verbose": false,
    "agnostic_nms": false,
    "half": true,
    "dnn": false
  }
}
```

### GET `/api/settings/available`
```json
{
  "success": true,
  "available_settings": {
    "model": {
      "type": "string",
      "options": ["yolo11n-pose.pt", "yolo11s-pose.pt"],
      "default": "yolo11n-pose.pt",
      "description": "YOLO model to use for pose detection",
      "info": {
        "yolo11n-pose.pt": {
          "name": "YOLO11N-POSE",
          "size_mb": 6.0,
          "description": "Nano model - Fastest, smallest, lowest accuracy",
          "performance": "Fastest"
        },
        "yolo11s-pose.pt": {
          "name": "YOLO11S-POSE", 
          "size_mb": 19.4,
          "description": "Small model - Good balance of speed and accuracy",
          "performance": "Fast"
        }
      }
    },
    "device": {
      "type": "string",
      "options": ["cpu", "cuda", "mps"],
      "default": "cuda",
      "description": "Device to run inference on",
      "capabilities": {
        "cpu": {
          "name": "CPU",
          "half_precision": false,
          "performance": "Low"
        },
        "cuda": {
          "name": "CUDA (RTX 4090)",
          "half_precision": true,
          "performance": "High"
        }
      }
    }
  }
}
```

## Funzionalità Avanzate

### 1. Rilevamento Device
- **CUDA**: Rileva automaticamente GPU NVIDIA
- **MPS**: Rileva Apple Silicon
- **CPU**: Sempre disponibile
- **Memoria**: Informazioni dettagliate per CUDA

### 2. Rilevamento Modelli ⭐ **NUOVO**
- **Auto-Scan**: Scansiona automaticamente la cartella models/
- **Modelli Supportati**: YOLO11n, YOLO11s, YOLO11m, YOLO11l, YOLO11x
- **Informazioni Dettagliate**: Dimensione, performance, descrizione
- **Fallback**: Usa modello raccomandato se specifico non disponibile

### 3. Validazione Intelligente
- **Device**: Solo device disponibili accettati
- **Model**: ⭐ **NUOVO** - Solo modelli disponibili accettati
- **Half Precision**: Abilitata solo per device supportati
- **Range Values**: Min/max per ogni parametro
- **Fallback**: Valori di default se invalidi

### 4. Settings Ottimali
- **Auto-Detection**: Settings ottimali basati su hardware
- **Model Selection**: ⭐ **NUOVO** - Modello più veloce selezionato automaticamente
- **Performance**: Device più veloce selezionato automaticamente
- **Memory**: Half precision abilitata se supportata

### 5. Refresh Automatico ⭐ **NUOVO**
- **Model Refresh**: Informazioni modelli aggiornate dopo ogni salvataggio
- **Directory Scan**: Re-scan della cartella models/ per nuovi modelli
- **Real-time Updates**: Stato download aggiornato in tempo reale
- **UI Sync**: Frontend aggiornato automaticamente con nuove informazioni
- **Debug Logging**: ⭐ **NUOVO** - Logging dettagliato per troubleshooting
- **Force Refresh**: ⭐ **NUOVO** - Endpoint dedicato per refresh manuale

## Flusso di Utilizzo

1. **Apertura Modal**: Frontend carica settings correnti e disponibili
2. **UI Dinamica**: Interfaccia adattata alle capacità del sistema
3. **Model Selection**: ⭐ **NUOVO** - Selezione modello con informazioni
4. **Validazione**: Controlli in tempo reale sui valori
5. **Salvataggio**: Settings validati inviati al backend
6. **Model Download**: ⭐ **NUOVO** - Download automatico se modello non presente
7. **Refresh Automatico**: ⭐ **NUOVO** - Informazioni modelli aggiornate
8. **Reload**: ⭐ **NUOVO** - Modello ricaricato se necessario
9. **UI Update**: ⭐ **NUOVO** - Frontend aggiornato con nuove informazioni
10. **Conferma**: Backend conferma settings applicati

## Benefici

- **User Experience**: Interfaccia intuitiva e dinamica
- **Robustezza**: Validazione completa dei parametri
- **Performance**: Settings ottimali automatici
- **Compatibilità**: Supporto multi-device e multi-modello
- **Debugging**: Informazioni dettagliate sui device e modelli

## Preparazione per OTLP

Il sistema è pronto per il logging OTLP:
- **Device Info**: Informazioni dettagliate per monitoring
- **Model Info**: ⭐ **NUOVO** - Informazioni sui modelli per monitoring
- **Settings Changes**: Tracking delle modifiche
- **Performance Metrics**: Correlazione device-model-settings-performance
- **Validation Events**: Logging delle validazioni fallite
- **Model Reload Events**: ⭐ **NUOVO** - Tracking dei reload dei modelli
- **Refresh Events**: ⭐ **NUOVO** - Tracking dei refresh automatici

## Troubleshooting

### Debug Logs
Il sistema include logging dettagliato per troubleshooting:
- **Backend Logs**: Refresh events, model detection, download status
- **Frontend Logs**: Model state, UI updates, API responses
- **Console Debug**: Browser console per debugging frontend

### Force Refresh
Se le informazioni sui modelli non si aggiornano:
1. **Endpoint**: `POST /api/settings/refresh-models`
2. **Frontend**: Chiamato automaticamente all'apertura modal
3. **Manual**: Può essere chiamato manualmente se necessario

### Common Issues
- **Stale Info**: Refresh automatico dovrebbe risolvere
- **Download Status**: Verificare cartella `models/`
- **UI Sync**: Controllare console browser per errori 