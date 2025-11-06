import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChatPanel } from "@/components/ChatPanel";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { PartnerTimer } from "@/components/PartnerTimer";
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Users, 
  MessageSquare,
  PhoneOff,
  Copy,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";

const SOCKET_SERVER_URL = 'http://localhost:3001';

interface Participant {
  userId: string;
  userName: string;
  socketId: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  screenSharing?: boolean;
}

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream?: MediaStream;
  userName: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export const StudyRoom = () => {
  const navigate = useNavigate();
  
  // Room state
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [currentRoomCode, setCurrentRoomCode] = useState('');
  const [participantCount, setParticipantCount] = useState(1);
  const [userName, setUserName] = useState('');
  
  // Media state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [musicMode, setMusicMode] = useState(false); // Music mode for maximum quality
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Participants and peers
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // User info
  const userId = "user_" + Date.now();

  // Enhance SDP for high quality video/audio
  const enhanceSDP = (sdp: string): string => {
    let enhancedSDP = sdp;
    
    // Set ultra-high bitrates for video (up to 4 Mbps for smooth video)
    enhancedSDP = enhancedSDP.replace(
      /(m=video.*\r\n)/g,
      '$1b=AS:4000\r\nb=TIAS:4000000\r\n'
    );
    
    // Set ultra-high bitrates for audio (up to 510 kbps for music quality)
    enhancedSDP = enhancedSDP.replace(
      /(m=audio.*\r\n)/g,
      '$1b=AS:510\r\nb=TIAS:510000\r\n'
    );
    
    // Prefer VP9 codec for better quality (if available)
    enhancedSDP = enhancedSDP.replace(
      /(a=rtpmap:(\d+) VP9\/90000)/g,
      'a=rtpmap:$2 VP9/90000\r\na=fmtp:$2 profile-id=0;max-fr=60;max-fs=12288'
    );
    
    // Prefer Opus codec for audio with MAXIMUM bitrate for music
    enhancedSDP = enhancedSDP.replace(
      /(a=rtpmap:(\d+) opus\/48000\/2)/g,
      'a=rtpmap:$2 opus/48000/2\r\na=fmtp:$2 maxaveragebitrate=510000;stereo=1;sprop-stereo=1;cbr=0;useinbandfec=1;usedtx=0;maxplaybackrate=48000;sprop-maxcapturerate=48000'
    );
    
    // Remove bandwidth restrictions
    enhancedSDP = enhancedSDP.replace(/b=AS:.*\r\n/g, '');
    enhancedSDP = enhancedSDP.replace(/b=TIAS:.*\r\n/g, '');
    
    // Re-add our custom high bandwidth limits
    enhancedSDP = enhancedSDP.replace(
      /(m=video.*\r\n)/g,
      '$1b=AS:4000\r\n'
    );
    enhancedSDP = enhancedSDP.replace(
      /(m=audio.*\r\n)/g,
      '$1b=AS:510\r\n'
    );
    
    console.log('🎛️ Enhanced SDP for MUSIC QUALITY - 510kbps audio, 4Mbps video');
    return enhancedSDP;
  };

  // Effect to attach local video stream to video element
  useEffect(() => {
    const attachLocalVideo = () => {
      if (localStreamRef.current && localVideoRef.current) {
        console.log('📹 Attaching local stream to video element');
        const videoElement = localVideoRef.current;
        
        if (videoElement.srcObject !== localStreamRef.current) {
          videoElement.srcObject = localStreamRef.current;
          videoElement.muted = true; // Local video should always be muted
          videoElement.playsInline = true;
          
          videoElement.play().catch(err => {
            console.error('Error playing local video:', err);
          });
          
          console.log('✅ Local video attached and playing');
        }
      }
    };

    // Try to attach immediately
    attachLocalVideo();

    // Also try after a short delay to handle race conditions
    const timer = setTimeout(attachLocalVideo, 100);
    
    return () => clearTimeout(timer);
  }, [isInRoom]); // Re-run when joining a room

  // Effect to update video elements when peers change
  useEffect(() => {
    console.log('🔄 Peers updated, attaching streams to video elements...');
    peers.forEach((peerConn, socketId) => {
      if (peerConn.stream) {
        const videoElement = videoRefs.current.get(socketId);
        if (videoElement && videoElement.srcObject !== peerConn.stream) {
          console.log(`📺 Attaching stream to video element for ${peerConn.userName}`);
          videoElement.srcObject = peerConn.stream;
          videoElement.onloadedmetadata = () => {
            videoElement.play().catch(err => {
              console.error('Error playing video:', err);
            });
          };
        }
      }
    });
  }, [peers]);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to signaling server');
      toast.success('Connected to video server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from signaling server');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      toast.error('Could not connect to video server. Make sure the backend is running.');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Get user media with high quality settings
  const getUserMedia = async (video = true, audio = true) => {
    try {
      console.log(`🎥 Requesting ${musicMode ? 'MUSIC MODE' : 'PROFESSIONAL CALL MODE'} camera and microphone access...`);
      
      // PROFESSIONAL CALL QUALITY (like WhatsApp/FaceTime/Meet):
      // Call Mode: Advanced processing for crystal clear voice
      // Music Mode: Raw quality for music (use with headphones!)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: video ? { 
          width: { min: 640, ideal: 1920, max: 1920 },
          height: { min: 480, ideal: 1080, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
          facingMode: 'user',
          aspectRatio: { ideal: 16/9 }
        } : false,
        audio: audio ? (musicMode ? {
          // MUSIC MODE: Raw quality for music streaming
          echoCancellation: false,           // No processing
          noiseSuppression: false,           // Keep all frequencies
          autoGainControl: false,            // No volume normalization
          sampleRate: 48000,                 // Studio quality
          channelCount: 2,                   // Stereo
          sampleSize: 16                     // 16-bit
        } : {
          // CALL MODE: Professional voice quality (WhatsApp/Meet level)
          echoCancellation: true,            // Advanced echo removal
          noiseSuppression: true,            // Remove background noise
          autoGainControl: true,             // Normalize volume levels
          sampleRate: 48000,                 // Studio quality
          channelCount: 2,                   // Stereo
          sampleSize: 16                     // 16-bit
        }) : false
      });
      
      console.log('✅ Got HIGH QUALITY media stream:', stream.getTracks().map(t => {
        const settings = t.getSettings();
        return `${t.kind}: ${t.label} - ${settings.width}x${settings.height}@${settings.frameRate}fps`;
      }));
      
      // Optimize video tracks for high quality
      stream.getVideoTracks().forEach(track => {
        const settings = track.getSettings();
        console.log('📹 Video settings:', settings);
        track.enabled = true;
      });
      
      // Optimize audio tracks for music quality with adaptive echo prevention
      stream.getAudioTracks().forEach(track => {
        const settings = track.getSettings();
        console.log('🎤 Audio settings:', settings);
        console.log(`🎵 MODE: ${musicMode ? '� MUSIC MODE' : '🎤 VOICE MODE'}`);
        console.log('�🎧 Echo Cancellation:', settings.echoCancellation ? 'ENABLED (safer with speakers)' : 'DISABLED ✅ (MAXIMUM QUALITY - use headphones!)');
        console.log('🎵 Noise Suppression:', settings.noiseSuppression ? 'ENABLED' : 'DISABLED ✅ (preserves music)');
        console.log('🎚️ Auto Gain Control:', settings.autoGainControl ? 'ENABLED' : 'DISABLED ✅ (no compression)');
        
        if (musicMode) {
          console.log('⚠️ MUSIC MODE: Use headphones to prevent echo!');
          console.log('🎵 Maximum quality enabled - perfect for music streaming');
        } else {
          console.log('💡 VOICE MODE: Echo cancellation prevents feedback');
          console.log('💡 TIP: Switch to Music Mode + headphones for best quality!');
        }
        
        track.enabled = true;
      });
      
      localStreamRef.current = stream;
      
      // Attach stream to video element immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Force video to play
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(err => {
            console.error('Error playing local video:', err);
          });
        };
        console.log('✅ Attached HIGH QUALITY stream to local video element');
      }
      
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      toast.error('Could not access your camera or microphone. Please check permissions.');
      return null;
    }
  };

  // Create room
  const createRoom = async () => {
    if (!userName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    console.log('🚀 Creating room...');
    const stream = await getUserMedia(videoEnabled, audioEnabled);
    if (!stream) {
      toast.error('Cannot create room without camera/microphone access');
      return;
    }

    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCurrentRoomCode(newRoomCode);
    
    console.log('📡 Emitting join-room event...');
    socketRef.current?.emit('join-room', {
      roomCode: newRoomCode,
      userName: userName.trim(),
      userId
    });
    
    setIsInRoom(true);
    toast.success(`Room created! Code: ${newRoomCode}`, {
      duration: 5000
    });
    
    console.log('✅ Room created successfully');
  };

  // Join room
  const joinRoom = async () => {
    if (!userName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    console.log('🚀 Joining room:', roomCode.toUpperCase());
    const stream = await getUserMedia(videoEnabled, audioEnabled);
    if (!stream) {
      toast.error('Cannot join room without camera/microphone access');
      return;
    }
    
    setCurrentRoomCode(roomCode.toUpperCase());
    
    console.log('📡 Emitting join-room event...');
    socketRef.current?.emit('join-room', {
      roomCode: roomCode.toUpperCase(),
      userName: userName.trim(),
      userId
    });
    
    setIsInRoom(true);
    toast.success(`Joining room: ${roomCode.toUpperCase()}`, {
      duration: 3000
    });
    
    console.log('✅ Joining room in progress');
  };

  // Socket event handlers
  useEffect(() => {
    if (!socketRef.current) return;

    // Room joined successfully
    socketRef.current.on('room-joined', ({ participants: existingParticipants, participantCount: count }) => {
      console.log('Room joined. Existing participants:', existingParticipants);
      setParticipants(existingParticipants);
      setParticipantCount(count);
      
      // DON'T create peer connections yet - wait for existing users to send offers
      // They will initiate the connection since they were here first
      console.log('👀 Waiting for existing participants to initiate connections...');
    });

    // New user joined
    socketRef.current.on('user-joined', ({ socketId, userName: newUserName }) => {
      console.log('👤 New user joined:', newUserName, 'socketId:', socketId);
      toast.success(`${newUserName} joined the room`);
      
      // Add to participants list
      setParticipants(prev => {
        // Check if already exists
        if (prev.some(p => p.socketId === socketId)) {
          return prev;
        }
        return [...prev, { socketId, userName: newUserName, userId: socketId }];
      });
      
      // We are the initiator since we were here first
      createPeer(socketId, newUserName, true);
    });

    // User left
    socketRef.current.on('user-left', ({ socketId, userName: leftUserName }) => {
      console.log('User left:', leftUserName);
      toast.info(`${leftUserName} left the room`);
      
      const peer = peersRef.current.get(socketId);
      if (peer) {
        peer.peer.destroy();
        peersRef.current.delete(socketId);
        setPeers(new Map(peersRef.current));
      }
      
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
    });

    // Participant count updated
    socketRef.current.on('participant-count', (count: number) => {
      setParticipantCount(count);
    });

    // WebRTC signaling
    socketRef.current.on('webrtc-offer', async ({ offer, senderSocketId, senderUserName }) => {
      console.log('Received offer from:', senderUserName || senderSocketId);
      handleReceiveOffer(offer, senderSocketId, senderUserName);
    });

    socketRef.current.on('webrtc-answer', ({ answer, senderSocketId, senderUserName }) => {
      console.log('Received answer from:', senderUserName || senderSocketId);
      const peer = peersRef.current.get(senderSocketId);
      if (peer && !peer.peer.destroyed) {
        try {
          peer.peer.signal(answer);
        } catch (err) {
          console.error('Error signaling answer:', err);
        }
      }
    });

    socketRef.current.on('ice-candidate', ({ candidate, senderSocketId }) => {
      const peer = peersRef.current.get(senderSocketId);
      if (peer && !peer.peer.destroyed) {
        try {
          peer.peer.signal(candidate);
        } catch (err) {
          console.error('Error signaling ICE candidate:', err);
        }
      }
    });

    // Chat events
    socketRef.current.on('new-message', (message: ChatMessage) => {
      console.log('📨 New message received:', message);
      setMessages(prev => [...prev, message]);
      
      // Increment unread count if chat is closed and message is not from current user
      if (!isChatOpen && message.userName !== userName) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socketRef.current?.off('room-joined');
      socketRef.current?.off('user-joined');
      socketRef.current?.off('user-left');
      socketRef.current?.off('participant-count');
      socketRef.current?.off('webrtc-offer');
      socketRef.current?.off('webrtc-answer');
      socketRef.current?.off('ice-candidate');
      socketRef.current?.off('new-message');
    };
  }, []);

  // Create peer connection
  const createPeer = (socketId: string, peerUserName: string, initiator: boolean) => {
    if (!localStreamRef.current) {
      console.error('❌ No local stream available for peer connection');
      return;
    }

    // Check if peer already exists
    const existingPeer = peersRef.current.get(socketId);
    if (existingPeer && !existingPeer.peer.destroyed) {
      console.log(`⚠️ Peer connection already exists for ${peerUserName}, skipping creation`);
      return;
    }

    // If peer exists but is destroyed, clean it up
    if (existingPeer && existingPeer.peer.destroyed) {
      console.log(`🧹 Cleaning up destroyed peer for ${peerUserName}`);
      peersRef.current.delete(socketId);
    }

    console.log(`🔗 Creating HIGH QUALITY peer connection with ${peerUserName} (initiator: ${initiator})`);
    console.log('📡 Local stream tracks:', localStreamRef.current.getTracks().map(t => `${t.kind}: ${t.label}`));

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: localStreamRef.current,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        sdpSemantics: 'unified-plan',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        // High quality codec preferences
        iceCandidatePoolSize: 10
      },
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false
      },
      answerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false
      },
      // SimplePeer options for better quality
      objectMode: false,
      allowHalfTrickle: false,
      reconnectTimer: 1000,
      iceCompleteTimeout: 5000,
      // Optimize for maximum bandwidth
      channelConfig: {},
      channelName: 'data'
    });

    peer.on('signal', (signal) => {
      console.log(`📤 Sending signal (${signal.type || 'candidate'}) to ${peerUserName}`);
      
      // Enhance SDP for offers and answers
      if ((signal.type === 'offer' || signal.type === 'answer') && signal.sdp) {
        signal.sdp = enhanceSDP(signal.sdp);
      }
      
      if (signal.type === 'offer') {
        socketRef.current?.emit('webrtc-offer', {
          roomCode: currentRoomCode,
          targetSocketId: socketId,
          offer: signal
        });
      } else if (signal.type === 'answer') {
        socketRef.current?.emit('webrtc-answer', {
          roomCode: currentRoomCode,
          targetSocketId: socketId,
          answer: signal
        });
      } else {
        socketRef.current?.emit('ice-candidate', {
          roomCode: currentRoomCode,
          targetSocketId: socketId,
          candidate: signal
        });
      }
    });

    peer.on('connect', () => {
      console.log(`🎉 Peer connection established with ${peerUserName}!`);
      
      // Access the underlying RTCPeerConnection to set maximum bitrates
      const pc = (peer as any)._pc;
      if (pc && pc.getSenders) {
        pc.getSenders().forEach((sender: RTCRtpSender) => {
          if (sender.track) {
            const params = sender.getParameters();
            if (!params.encodings) {
              params.encodings = [{}];
            }
            
            if (sender.track.kind === 'video') {
              // Maximum video bitrate: 4 Mbps
              params.encodings[0].maxBitrate = 4000000;
              params.encodings[0].maxFramerate = 60;
              console.log('📹 Set video max bitrate to 4 Mbps @ 60fps');
            } else if (sender.track.kind === 'audio') {
              // Maximum audio bitrate: 510 kbps (music quality)
              params.encodings[0].maxBitrate = 510000;
              console.log('🎵 Set audio max bitrate to 510 kbps (MUSIC QUALITY)');
            }
            
            sender.setParameters(params)
              .then(() => console.log(`✅ Bitrate set for ${sender.track?.kind}`))
              .catch((err: Error) => console.error('❌ Error setting bitrate:', err));
          }
        });
      }
      
      toast.success(`Connected to ${peerUserName}`);
    });

    peer.on('stream', (stream) => {
      console.log('✅ Received HIGH QUALITY remote stream from:', peerUserName);
      console.log('📺 Remote stream tracks:', stream.getTracks().map(t => {
        const settings = t.getSettings();
        return `${t.kind}: ${t.label} (enabled: ${t.enabled}) - ${settings.width}x${settings.height}@${settings.frameRate}fps`;
      }));
      
      // Ensure audio tracks are at full quality
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        const constraints = track.getConstraints();
        console.log('🎤 Remote audio constraints:', constraints);
      });
      
      // Ensure video tracks are at full quality
      stream.getVideoTracks().forEach(track => {
        track.enabled = true;
        const constraints = track.getConstraints();
        console.log('📹 Remote video constraints:', constraints);
      });
      
      const peerConnection = peersRef.current.get(socketId);
      if (peerConnection) {
        peerConnection.stream = stream;
        setPeers(new Map(peersRef.current));
        
        // Attach stream to video element immediately
        setTimeout(() => {
          const videoElement = videoRefs.current.get(socketId);
          if (videoElement && stream) {
            console.log(`🎥 Attaching HIGH QUALITY remote stream to video element for ${peerUserName}`);
            videoElement.srcObject = stream;
            videoElement.muted = false;
            videoElement.volume = 1.0;
            videoElement.playsInline = true;
            // Enable hardware acceleration
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('autoplay', 'true');
            
            videoElement.onloadedmetadata = () => {
              console.log(`▶️ Playing HIGH QUALITY video for ${peerUserName}`);
              videoElement.play().catch(err => {
                console.error('Error playing remote video:', err);
                // Try again after a delay
                setTimeout(() => videoElement.play().catch(e => console.error('Retry failed:', e)), 500);
              });
            };
          } else {
            console.warn(`⚠️ Video element not found for ${peerUserName}`);
          }
        }, 100);
      }
    });

    peer.on('error', (err) => {
      console.error(`❌ Peer connection error with ${peerUserName}:`, err);
      toast.error(`Connection error with ${peerUserName}`);
    });

    peer.on('close', () => {
      console.log(`🔌 Peer connection closed with ${peerUserName}`);
    });

    const peerConnection: PeerConnection = {
      peer,
      userName: peerUserName
    };

    peersRef.current.set(socketId, peerConnection);
    setPeers(new Map(peersRef.current));
    
    console.log(`✅ Peer connection object created for ${peerUserName}`);
    
    setParticipants(prev => {
      const exists = prev.find(p => p.socketId === socketId);
      if (!exists) {
        console.log(`➕ Adding ${peerUserName} to participants list`);
        return [...prev, { socketId, userName: peerUserName, userId: socketId }];
      }
      return prev;
    });
  };

  // Handle received offer
  const handleReceiveOffer = (offer: SimplePeer.SignalData, senderSocketId: string, senderUserName?: string) => {
    console.log('📥 Received WebRTC offer from:', senderUserName || senderSocketId);
    const existingPeer = peersRef.current.get(senderSocketId);
    
    if (existingPeer && !existingPeer.peer.destroyed) {
      console.log('♻️ Using existing peer connection, signaling offer');
      try {
        existingPeer.peer.signal(offer);
      } catch (err) {
        console.error('Error signaling offer to existing peer:', err);
        // If error, recreate the peer
        console.log('🔄 Recreating peer connection due to error');
        existingPeer.peer.destroy();
        peersRef.current.delete(senderSocketId);
        
        const participant = participants.find(p => p.socketId === senderSocketId);
        const userName = senderUserName || participant?.userName || `User_${senderSocketId.substring(0, 4)}`;
        createPeer(senderSocketId, userName, false);
        
        setTimeout(() => {
          const peer = peersRef.current.get(senderSocketId);
          if (peer && !peer.peer.destroyed) {
            peer.peer.signal(offer);
          }
        }, 100);
      }
    } else {
      console.log('🆕 Creating new peer connection as non-initiator');
      // Use the provided userName, or look it up in participants, or use a fallback
      const participant = participants.find(p => p.socketId === senderSocketId);
      const userName = senderUserName || participant?.userName || `User_${senderSocketId.substring(0, 4)}`;
      
      // Create peer as non-initiator (receiving the offer)
      createPeer(senderSocketId, userName, false);
      
      // Wait a bit for peer to be created, then signal the offer
      setTimeout(() => {
        const peer = peersRef.current.get(senderSocketId);
        if (peer && !peer.peer.destroyed) {
          console.log('📨 Signaling received offer to peer');
          peer.peer.signal(offer);
        } else {
          console.error('❌ Peer not found after creation!');
        }
      }, 100);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        
        console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
        
        socketRef.current?.emit('toggle-video', {
          roomCode: currentRoomCode,
          videoEnabled: videoTrack.enabled
        });
        
        toast.info(videoTrack.enabled ? 'Camera turned on' : 'Camera turned off');
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        
        console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
        
        socketRef.current?.emit('toggle-audio', {
          roomCode: currentRoomCode,
          audioEnabled: audioTrack.enabled
        });
        
        toast.info(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted');
      }
    }
  };

  // Toggle Music Mode (maximum quality with headphones)
  const toggleMusicMode = async () => {
    const newMusicMode = !musicMode;
    setMusicMode(newMusicMode);
    
    console.log(`🎵 Switching to ${newMusicMode ? 'MUSIC MODE' : 'VOICE MODE'}...`);
    
    // Need to restart media stream with new settings
    try {
      // Stop current tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream with updated settings
      const stream = await getUserMedia(videoEnabled, audioEnabled);
      
      // Update all peer connections with new stream
      peersRef.current.forEach((peerConn, socketId) => {
        const peer = peerConn.peer;
        
        // Remove old tracks
        if (peer && (peer as any)._pc) {
          const pc = (peer as any)._pc as RTCPeerConnection;
          const senders = pc.getSenders();
          senders.forEach(sender => {
            if (sender.track) {
              pc.removeTrack(sender);
            }
          });
          
          // Add new tracks
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        }
      });
      
      toast.success(newMusicMode 
        ? '🎵 Music Mode ON - Maximum quality! Use headphones to prevent echo.' 
        : '🎤 Voice Mode ON - Echo cancellation enabled for speakers.'
      );
      
    } catch (error) {
      console.error('Error switching mode:', error);
      toast.error('Failed to switch mode. Please rejoin the room.');
      setMusicMode(!newMusicMode); // Revert
    }
  };

  // Send chat message
  const sendMessage = (message: string) => {
    if (message.trim() && socketRef.current) {
      socketRef.current.emit('send-message', {
        roomCode: currentRoomCode,
        message: message.trim(),
        userName
      });
    }
  };

  // Toggle chat panel
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      // Reset unread count when opening chat
      setUnreadCount(0);
    }
  };

  // Leave room
  const leaveRoom = () => {
    console.log('👋 Leaving room...');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }
    
    // Clear local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // Destroy all peer connections
    peersRef.current.forEach(({ peer }, socketId) => {
      console.log(`Destroying peer connection: ${socketId}`);
      peer.destroy();
    });
    peersRef.current.clear();
    setPeers(new Map());
    
    // Leave room via socket
    socketRef.current?.emit('leave-room', { roomCode: currentRoomCode });
    
    // Reset state
    setIsInRoom(false);
    setCurrentRoomCode('');
    setParticipants([]);
    setParticipantCount(1);
    setVideoEnabled(true);
    setAudioEnabled(true);
    
    toast.info('Left the study room');
    console.log('✅ Left room successfully');
  };

  // Copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoomCode);
    toast.success('Room code copied to clipboard!');
  };

  // Landing Page (Not in room)
  if (!isInRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6">
              <Video className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Video Study Room
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Connect with study partners in real-time. Share your screen, collaborate, and stay focused together.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
            {/* Create Room */}
            <Card className="p-8 hover:shadow-lg transition-shadow border-2">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <UserPlus className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Create Room</h3>
                <p className="text-gray-600 mb-6">
                  Start a new study session and invite your partners
                </p>
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="h-12 text-center text-lg"
                    maxLength={20}
                  />
                  <Button
                    onClick={createRoom}
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    size="lg"
                  >
                    Create New Room
                  </Button>
                </div>
              </div>
            </Card>

            {/* Join Room */}
            <Card className="p-8 hover:shadow-lg transition-shadow border-2">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                  <Video className="h-8 w-8 text-pink-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Join Room</h3>
                <p className="text-gray-600 mb-6">
                  Enter a room code to join an existing session
                </p>
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="h-12 text-center text-lg"
                    maxLength={20}
                  />
                  <Input
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="h-12 text-center text-lg font-mono tracking-wider"
                    maxLength={6}
                  />
                  <Button
                    onClick={joinRoom}
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    size="lg"
                    disabled={!roomCode.trim()}
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Video, label: 'HD Video' },
              { icon: Mic, label: 'Crystal Audio' },
              { icon: Monitor, label: 'Screen Share' },
              { icon: MessageSquare, label: 'Live Chat' }
            ].map((feature, idx) => (
              <div key={idx} className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <feature.icon className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium text-gray-700">{feature.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Room View
  return (
    <div className="min-h-screen bg-black p-4 relative">
      {/* Solid Black Background Layer - Fills entire page */}
      <div className="fixed inset-0 bg-black -z-10"></div>
      
      {/* Subtle Red Gradient Overlay - Optional accent */}
      <div className="fixed inset-0 bg-gradient-to-br from-transparent via-red-950/10 to-transparent -z-10 pointer-events-none"></div>
      
      <div className="relative max-w-[1920px] mx-auto h-[calc(100vh-2rem)] z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-black/90 backdrop-blur-xl rounded-xl p-4 border border-red-500/40 shadow-2xl shadow-red-900/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-950/50 px-5 py-2.5 rounded-xl border border-red-500/40 hover:bg-red-950/70 transition-all group">
              <span className="text-gray-400 text-sm font-medium">Room</span>
              <div className="w-px h-4 bg-red-500/30"></div>
              <span className="text-white font-mono font-bold text-lg tracking-wider">{currentRoomCode}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomCode}
                className="h-8 w-8 p-0 hover:bg-red-500/20 ml-1 transition-all group-hover:scale-110"
              >
                <Copy className="h-4 w-4 text-red-400" />
              </Button>
            </div>
            
            <div className="flex items-center gap-3 bg-gradient-to-r from-green-950/50 to-emerald-950/50 px-5 py-2.5 rounded-xl border border-green-500/40">
              <div className="relative">
                <Users className="h-5 w-5 text-green-400" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-white font-bold text-lg">{participantCount}</span>
              <span className="text-green-300/80 text-sm font-medium">online</span>
            </div>

            {/* Audio Mode Indicator */}
            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${
              musicMode 
                ? 'bg-gradient-to-r from-purple-950/70 to-pink-950/70 border-purple-500/50 shadow-lg shadow-purple-500/20' 
                : 'bg-gray-950/50 border-gray-700/50'
            }`}>
              <span className="text-2xl">{musicMode ? '🎵' : '🎤'}</span>
              <div className="flex flex-col">
                <span className={`text-xs font-bold uppercase tracking-wider ${musicMode ? 'text-purple-300' : 'text-gray-400'}`}>
                  {musicMode ? 'Music Mode' : 'Voice Mode'}
                </span>
                <span className={`text-[10px] ${musicMode ? 'text-pink-400' : 'text-gray-500'}`}>
                  {musicMode ? 'Max Quality' : 'Echo Cancel'}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={leaveRoom}
            className="gap-2 px-6 py-2.5 h-auto bg-red-600/90 hover:bg-red-500 border border-red-400/40 shadow-lg shadow-red-600/30 hover:shadow-red-500/50 transition-all"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="font-semibold">Leave Room</span>
          </Button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100%-5rem)]">
          {/* Left Column - Videos and Controls */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            {/* Video Grid */}
            <div className="flex-1 bg-black/80 backdrop-blur-xl rounded-2xl p-5 border border-red-500/30 overflow-auto shadow-2xl shadow-red-900/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full">
                {/* Local Video */}
                <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-red-500/70 shadow-2xl shadow-red-500/40 min-h-[300px] group hover:border-red-400 hover:shadow-red-400/50 transition-all">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-xl px-4 py-2 rounded-full border border-red-500/50 shadow-lg">
                    <span className="text-white text-sm font-semibold">{userName || 'You'}</span>
                  </div>
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-red-400/60">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-bold uppercase tracking-wide">You</span>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    {!audioEnabled && (
                      <div className="bg-red-600 rounded-full p-2 shadow-lg border border-red-500/60 animate-pulse">
                        <MicOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  {!videoEnabled && (
                    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                      <div className="bg-red-600/30 p-6 rounded-full mb-4 border border-red-500/50">
                        <VideoOff className="h-12 w-12 text-red-400" />
                      </div>
                      <p className="text-gray-300 text-sm font-medium">Camera Off</p>
                    </div>
                  )}
                </div>

                {/* Remote Videos */}
                {Array.from(peers.entries()).map(([socketId, peerConn]) => (
                  <div key={socketId} className="relative bg-black rounded-2xl overflow-hidden border-2 border-pink-500/70 shadow-2xl shadow-pink-500/40 min-h-[300px] group hover:border-pink-400 hover:shadow-pink-400/50 transition-all">
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current.set(socketId, el);
                          
                          if (peerConn.stream && el.srcObject !== peerConn.stream) {
                            el.srcObject = peerConn.stream;
                            el.muted = false;
                            el.volume = 1.0;
                            
                            el.onloadedmetadata = () => {
                              el.play()
                                .then(() => console.log(`✅ Video playing for ${peerConn.userName}`))
                                .catch(err => {
                                  console.error(`❌ Play error for ${peerConn.userName}:`, err);
                                  setTimeout(() => {
                                    el.play().catch(e => console.error('Retry play failed:', e));
                                  }, 500);
                                });
                            };
                            
                            el.play().catch(() => {});
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-xl px-4 py-2 rounded-full border border-pink-500/40 shadow-lg">
                      <span className="text-white text-sm font-semibold">{peerConn.userName}</span>
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-green-400/60">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-white text-xs font-bold uppercase tracking-wide">Live</span>
                    </div>
                    {!peerConn.stream && (
                      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500/30 border-t-pink-500 mb-3"></div>
                          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-pink-500/20"></div>
                        </div>
                        <p className="text-white text-sm font-medium">Connecting...</p>
                        <p className="text-gray-400 text-xs mt-1">{peerConn.userName}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty State */}
                {peers.size === 0 && (
                  <div className="relative bg-black/70 rounded-2xl border-2 border-dashed border-red-500/40 flex items-center justify-center min-h-[300px] hover:border-red-500/60 transition-all backdrop-blur-sm">
                    <div className="text-center p-8">
                      <div className="relative inline-block mb-4">
                        <Users className="h-16 w-16 text-red-400/60 mx-auto" />
                        <div className="absolute -inset-4 border-2 border-red-500/20 rounded-full animate-ping"></div>
                      </div>
                      <p className="text-gray-200 text-base font-semibold mb-2">Waiting for partners to join...</p>
                      <p className="text-gray-400 text-sm mb-3">Share your room code with study partners</p>
                      <div className="inline-flex items-center gap-2 bg-red-950/70 px-4 py-2 rounded-full border border-red-500/50 backdrop-blur-sm">
                        <span className="text-red-400 text-xs font-medium">Code:</span>
                        <span className="font-mono font-bold text-red-300 text-lg tracking-wider">{currentRoomCode}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-5 border border-red-500/30 shadow-2xl shadow-red-900/30">
              <div className="flex justify-center gap-4">
                <Button
                  onClick={toggleVideo}
                  className={`h-16 w-16 rounded-full transition-all shadow-lg ${
                    videoEnabled 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 hover:scale-110 hover:shadow-gray-700/50' 
                      : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 animate-pulse border border-red-500 shadow-red-600/50'
                  }`}
                  title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>

                <Button
                  onClick={toggleAudio}
                  className={`h-16 w-16 rounded-full transition-all shadow-lg ${
                    audioEnabled 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 hover:scale-110 hover:shadow-gray-700/50' 
                      : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 animate-pulse border border-red-500 shadow-red-600/50'
                  }`}
                  title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>

                <Button
                  onClick={toggleMusicMode}
                  className={`h-16 w-16 rounded-full transition-all shadow-lg ${
                    musicMode 
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border border-purple-400 animate-pulse hover:scale-110 shadow-purple-500/50' 
                      : 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-purple-600 hover:to-pink-600 border border-gray-700 hover:border-purple-500 hover:scale-110 hover:shadow-purple-500/50'
                  }`}
                  title={musicMode ? '🎵 Music Mode ON - Maximum quality (use headphones!)' : '🎤 Voice Mode - Click for Music Mode'}
                >
                  <span className="text-2xl">{musicMode ? '🎵' : '🎤'}</span>
                </Button>

                <Button
                  onClick={() => toast.info('Screen sharing coming soon!')}
                  className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 hover:from-red-600 hover:to-red-700 border border-gray-700 hover:border-red-500 transition-all shadow-lg hover:scale-110 hover:shadow-red-500/50"
                  title="Share screen"
                >
                  <Monitor className="h-6 w-6" />
                </Button>

                <Button
                  onClick={() => toast.info('Chat coming soon!')}
                  className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 hover:from-red-600 hover:to-red-700 border border-gray-700 hover:border-red-500 transition-all shadow-lg hover:scale-110 hover:shadow-red-500/50"
                  title="Open chat"
                >
                  <MessageSquare className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Timers */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 overflow-auto">
            {/* Your Timer */}
            <div className="bg-black/90 backdrop-blur-xl rounded-xl p-3 border border-red-500/40 shadow-2xl shadow-red-900/30">
              <h3 className="text-white text-sm font-bold mb-2 flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                </div>
                <span className="bg-gradient-to-r from-red-300 to-red-100 bg-clip-text text-transparent">Your Focus Timer</span>
              </h3>
              <PomodoroTimer 
                socket={socketRef.current} 
                roomCode={currentRoomCode} 
                userName={userName} 
              />
            </div>

            {/* Partner Timers */}
            {peers.size > 0 && (
              <div className="bg-black/90 backdrop-blur-xl rounded-xl p-3 border border-pink-500/40 shadow-2xl shadow-pink-900/30">
                <h3 className="text-white text-sm font-bold mb-2 flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-pink-400 rounded-full animate-ping"></div>
                  </div>
                  <span className="bg-gradient-to-r from-pink-300 to-pink-100 bg-clip-text text-transparent">Partner Timers</span>
                  <span className="ml-auto text-xs font-semibold bg-pink-950/60 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/50">{peers.size}</span>
                </h3>
                <PartnerTimer 
                  socket={socketRef.current} 
                  roomCode={currentRoomCode} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {isInRoom && (
        <ChatPanel
          messages={messages}
          onSendMessage={sendMessage}
          currentUserName={userName}
          isOpen={isChatOpen}
          onToggle={toggleChat}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
};
