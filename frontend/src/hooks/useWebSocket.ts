import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (data: any) => void;
  lastMessage: string | null;
  error: string | null;
  messageQueueSize: number;
  averageLatency: number;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageQueueSize, setMessageQueueSize] = useState(0);
  const [averageLatency, setAverageLatency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueue = useRef<any[]>([]);
  const latencyHistory = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      // Clear any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      setConnectionStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setMessageQueueSize(0);
        setConnectionStatus('connected');
        messageQueue.current = [];
        reconnectAttempts.current = 0;
        console.log('WebSocket connected');
        
        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
          }
        }, 30000); // 30 second heartbeat
      };

      ws.onmessage = (event) => {
        const startTime = performance.now();
        
        // Handle different message types
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            // Respond to ping
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            return;
          }
          
          if (data.type === 'heartbeat_response') {
            // Heartbeat response received
            return;
          }
          
          setLastMessage(event.data);
          
          // Calculate latency
          if (data.timestamp) {
            const latency = Date.now() - data.timestamp;
            
            // Only add reasonable latency values
            if (latency > 0 && latency < 10000) {
              latencyHistory.current.push(latency);
              
              // Keep only last 10 latency measurements
              if (latencyHistory.current.length > 10) {
                latencyHistory.current.shift();
              }
              
              const avgLatency = latencyHistory.current.reduce((a, b) => a + b, 0) / latencyHistory.current.length;
              setAverageLatency(avgLatency);
            }
          }
        } catch (e) {
          // Handle non-JSON messages (like binary data)
        setLastMessage(event.data);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected', event.code, event.reason);
        
        // Clear heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        // Don't clear lastMessage on disconnect to maintain canvas state
        // setLastMessage(null);
      };

      ws.onerror = (event) => {
        setError('WebSocket error occurred');
        setConnectionStatus('disconnected');
        console.error('WebSocket error:', event);
      };

    } catch (err) {
      setError('Failed to create WebSocket connection');
      setConnectionStatus('disconnected');
      console.error('WebSocket connection error:', err);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Add timestamp for latency calculation
      const messageWithTimestamp = {
        ...data,
        timestamp: Date.now()
      };
      
      if (data instanceof ArrayBuffer) {
        wsRef.current.send(data);
      } else {
        wsRef.current.send(JSON.stringify(messageWithTimestamp));
      }
    } else {
      // Queue message if not connected
      messageQueue.current.push(data);
      setMessageQueueSize(messageQueue.current.length);
      
      // Limit queue size to prevent memory issues
      if (messageQueue.current.length > 50) {
        messageQueue.current.shift();
        console.warn('Message queue limit reached, dropping oldest message');
      }
    }
  }, []);

  // Process queued messages when connected
  useEffect(() => {
    if (isConnected && messageQueue.current.length > 0) {
      const queuedMessages = [...messageQueue.current];
      messageQueue.current = [];
      setMessageQueueSize(0);
      
      queuedMessages.forEach(msg => {
        sendMessage(msg);
      });
    }
  }, [isConnected, sendMessage]);

  // Auto-reconnect logic with exponential backoff
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect on connection loss with exponential backoff
  useEffect(() => {
    if (!isConnected && !error && reconnectAttempts.current < maxReconnectAttempts) {
      setConnectionStatus('reconnecting');
      const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, backoffTime);
      
      return () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    } else if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionStatus('disconnected');
      setError('Max reconnection attempts reached');
    }
  }, [isConnected, error, connect, messageQueueSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    sendMessage,
    lastMessage,
    error,
    messageQueueSize,
    averageLatency,
    connectionStatus
  };
}; 