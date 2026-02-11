import React, { useState, useRef, useEffect } from 'react';
import './styles.css';

/**
 * Aethea - Doctor Consultation Chat
 * Secure messaging and video consultation
 */

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'doctor';
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
}

const mockDoctor: Doctor = {
  id: 'dr-001',
  name: 'Dr. Ahmed Hassan',
  specialty: 'Cardiologist',
  avatar: '👨‍⚕️',
  status: 'online',
};

const mockMessages: Message[] = [
  {
    id: 'msg-001',
    senderId: 'dr-001',
    senderName: 'Dr. Ahmed Hassan',
    senderRole: 'doctor',
    content: 'Good morning! I reviewed your recent lab results. How have you been feeling?',
    timestamp: new Date('2026-02-08T09:15:00'),
    type: 'text',
  },
  {
    id: 'msg-002',
    senderId: 'patient-001',
    senderName: 'You',
    senderRole: 'patient',
    content:
      "Good morning Doctor. I have been feeling much better since following the diet plan you recommended.",
    timestamp: new Date('2026-02-08T09:17:00'),
    type: 'text',
  },
  {
    id: 'msg-003',
    senderId: 'dr-001',
    senderName: 'Dr. Ahmed Hassan',
    senderRole: 'doctor',
    content:
      "That is great to hear! Your cholesterol levels have improved significantly. Continue with the current plan and let me know if you have any concerns.",
    timestamp: new Date('2026-02-08T09:19:00'),
    type: 'text',
  },
  {
    id: 'msg-004',
    senderId: 'patient-001',
    senderName: 'You',
    senderRole: 'patient',
    content:
      'Thank you! Should I continue taking the medication at the same dosage?',
    timestamp: new Date('2026-02-08T09:21:00'),
    type: 'text',
  },
];

export default function DoctorChatPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: `msg-${Date.now()}`,
        senderId: 'patient-001',
        senderName: 'You',
        senderRole: 'patient',
        content: newMessage,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([...messages, message]);
      setNewMessage('');

      // Simulate doctor response after 2 seconds
      setTimeout(() => {
        const doctorResponse: Message = {
          id: `msg-${Date.now()}`,
          senderId: mockDoctor.id,
          senderName: mockDoctor.name,
          senderRole: 'doctor',
          content:
            "Yes, continue with the same dosage for now. We will reassess in your next appointment.",
          timestamp: new Date(),
          type: 'text',
        };
        setMessages((prev) => [...prev, doctorResponse]);
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="doctor-chat-page">
      {/* Header */}
      <div className="chat-header">
        <div className="doctor-info">
          <div className="doctor-avatar-container">
            <div className="doctor-avatar">{mockDoctor.avatar}</div>
            <span className={`status-indicator ${mockDoctor.status}`} />
          </div>
          <div>
            <h2>{mockDoctor.name}</h2>
            <p>{mockDoctor.specialty}</p>
          </div>
        </div>

        <div className="chat-actions">
          <button
            className="action-btn video"
            onClick={() => setIsVideoCallActive(!isVideoCallActive)}
          >
            📹 Video Call
          </button>
          <button className="action-btn">📞 Voice Call</button>
          <button className="action-btn">ℹ️</button>
        </div>
      </div>

      {/* Video Call Overlay */}
      {isVideoCallActive && (
        <div className="video-call-overlay">
          <div className="video-container">
            <div className="remote-video">
              <div className="video-placeholder">
                <span className="video-avatar">{mockDoctor.avatar}</span>
                <p>{mockDoctor.name}</p>
              </div>
            </div>
            <div className="local-video">
              <div className="video-placeholder mini">
                <span>You</span>
              </div>
            </div>
          </div>
          <div className="video-controls">
            <button className="control-btn">🎤 Mute</button>
            <button className="control-btn">📹 Video</button>
            <button
              className="control-btn end-call"
              onClick={() => setIsVideoCallActive(false)}
            >
              📞 End Call
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages-list">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderRole === 'patient' ? 'sent' : 'received'}`}
            >
              {message.senderRole === 'doctor' && (
                <div className="message-avatar">{mockDoctor.avatar}</div>
              )}
              <div className="message-content">
                <div className="message-bubble">
                  <p>{message.content}</p>
                </div>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Responses */}
      <div className="quick-responses">
        <button
          className="quick-response-btn"
          onClick={() => setNewMessage('I have a question about my medication')}
        >
          💊 Medication question
        </button>
        <button
          className="quick-response-btn"
          onClick={() => setNewMessage("I would like to schedule a follow-up appointment")}
        >
          📅 Schedule appointment
        </button>
        <button
          className="quick-response-btn"
          onClick={() => setNewMessage('Can you review my latest lab results?')}
        >
          🧪 Lab results
        </button>
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <button className="attachment-btn" title="Attach file">
          📎
        </button>
        <button className="attachment-btn" title="Take photo">
          📷
        </button>
        <textarea
          className="message-input"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          ➤
        </button>
      </div>

      {/* Security Banner */}
      <div className="security-banner">
        <span className="security-icon">🔒</span>
        <span>End-to-end encrypted • Your conversation is private and secure</span>
      </div>
    </div>
  );
}
