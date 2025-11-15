// client/src/pages/VideoCallRoomPage.js
// ✅ GIAO DIỆN MỚI - Theme Y Tế Xanh Pastel

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import videoService from '../services/videoService';
import chatService from '../services/chatService';
import axios from 'axios';
import { 
  FaPhoneSlash, 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash,
  FaDesktop,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimes,
  FaClock,
  FaUserMd,
  FaUser,
  FaWifi,
  FaCheckCircle,
  FaComments,
  FaPaperPlane,
  FaSmile,
  FaPaperclip,
  FaImage,
  FaMagic
} from 'react-icons/fa';
import './VideoCallRoomPage.css';

const VideoCallRoomPage = () => {
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  
  // State
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callStatus, setCallStatus] = useState('Đang kết nối...');
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, medium, poor
  
  // State điều khiển
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // State Modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // ✅ THÊM: State Chat Box
  const [showChatBox, setShowChatBox] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // ✅ THÊM: State Emoji Reactions
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const emojiReactions = ['❤️', '👍', '😂', '😮', '👏', '🔥', '🎉', '💯'];
  
  // ✅ THÊM: State Beauty Filter
  const [beautyFilterLevel, setBeautyFilterLevel] = useState(0); // 0-100
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Timer
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);

  // Video Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // THÊM MỚI: State xác thực OTP
  // Bác sĩ được vào thẳng, bệnh nhân phải chờ
  const [isVerified, setIsVerified] = useState(user.role === 'doctor');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  // THÊM MỚI: State đếm ngược
  const [resendCooldown, setResendCooldown] = useState(0);

  // ========== USEEFFECT - KHỞI TẠO ==========
  useEffect(() => {
    let isMounted = true;
    let streamInitialized = false;

    const init = async () => {
      try {
        console.log('🎬 [VideoCall] Khởi tạo phòng video call...');
        
        // 1. Lấy thông tin consultation
        const res = await consultationService.getConsultationById(consultationId);
        if (!isMounted) return;
        
        const consultationData = res.data.data || res.data;
        setConsultation(consultationData);
        console.log('✅ [VideoCall] Đã tải thông tin consultation');

        // 2. Kiểm tra trạng thái consultation
        if (consultationData.status !== 'confirmed' && consultationData.status !== 'in_progress') {
          // SỬA: Cung cấp thông báo lỗi rõ ràng hơn
          let errorMessage = `Buổi tư vấn chưa sẵn sàng (Trạng thái: ${consultationData.status})`;
          if (consultationData.status === 'cancelled') {
            errorMessage = 'Buổi tư vấn này đã bị hủy. Bạn không thể tham gia.';
          } else if (consultationData.status === 'completed') {
            errorMessage = 'Buổi tư vấn này đã kết thúc.';
          } else if (consultationData.status === 'pending') {
            errorMessage = 'Buổi tư vấn này đang chờ bác sĩ xác nhận.';
          }
          
          setError(errorMessage);
          setLoading(false);
          return;
        }

        // 3. Kết nối WebSocket
        // SỬA: Chỉ chạy khi đã xác thực (Bác sĩ) hoặc (Bệnh nhân đã nhập OTP)
        if (isVerified) {
          console.log('📡 [VideoCall] Đang kết nối WebSocket...');
          await chatService.connect(user.id, consultationId);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!chatService.isConnected()) {
          throw new Error('WebSocket không kết nối được');
        }
        console.log('✅ [VideoCall] WebSocket đã sẵn sàng');

        // 4. Bắt đầu stream
        console.log('📹 [VideoCall] Đang yêu cầu quyền camera/mic...');
        await videoService.startLocalStream();
        if (!isMounted) return;
        streamInitialized = true;
        console.log('✅ [VideoCall] Đã lấy được stream');

        // 5. Đăng ký callbacks
        videoService.onLocalStream = (stream) => {
          if (localVideoRef.current && isMounted) {
            localVideoRef.current.srcObject = stream;
            console.log('✅ [VideoCall] Local video đã được set');
          }
        };
        
        videoService.onRemoteStream = (stream) => {
          if (remoteVideoRef.current && isMounted) {
            remoteVideoRef.current.srcObject = stream;
            
            // Force unmute và bật âm thanh
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1.0;
            remoteVideoRef.current.play().catch(err => {
              console.warn('⚠️ Autoplay bị chặn:', err);
            });
            
            setCallStatus('Đang diễn ra');
            startCallTimer(); // Bắt đầu đếm giờ
            console.log('✅ [VideoCall] Remote video đã được set');
            
            const audioTracks = stream.getAudioTracks();
            console.log('🎤 [VideoCall] Remote audio tracks:', audioTracks.length, audioTracks);
          }
        };
        
        videoService.onCallEnded = () => {
          if (isMounted) {
            setCallStatus('Đã kết thúc');
            stopCallTimer();
            setTimeout(() => {
              navigate(`/tu-van/${consultationId}`);
            }, 1000);
          }
        };

        // 6. Tạo Peer Connection
        console.log('🔌 [VideoCall] Đang tạo Peer Connection...');
        await videoService.createPeerConnection(consultationId);
        if (!isMounted) return;
        
        setLoading(false);
        setCallStatus('Đang chờ người tham gia...');

        // 7. Chỉ Bác sĩ mới tạo Offer
        if (user.role === 'doctor') {
          console.log('👨‍⚕️ [VideoCall] Bác sĩ đang tạo Offer...');
          setTimeout(async () => {
            if (isMounted) {
              await videoService.createOffer();
            }
          }, 500);
        } else {
          console.log('🧑‍⚕️ [VideoCall] Bệnh nhân đang chờ Offer từ bác sĩ...');
        }
       // SỬA: Thêm dấu } để đóng if(isVerified)

      } catch (err) {
        console.error('❌ [VideoCall] Lỗi khởi tạo:', err);
        if (isMounted) {
          setError(err.message || 'Không thể khởi tạo phòng video call');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      console.log('🧹 [VideoCall] Cleanup...');
      isMounted = false;
      stopCallTimer();
      if (streamInitialized) {
        videoService.hangUp();
      }
      if (chatService.isConnected()) {
        chatService.leaveConsultation(consultationId);
      }
    };
  }, [consultationId, user.id, user.role, navigate, isVerified]); // SỬA: Thêm isVerified

  // THÊM MỚI: Hàm xử lý gửi lại OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return; // Ngăn spam

    setOtpError(''); // Xóa lỗi cũ
    try {
      setLoading(true); // Dùng chung state loading
      await consultationService.resendVideoOtp(consultationId);
      // Hiển thị thông báo thành công qua trường error
      setOtpError('Đã gửi lại mã OTP. Vui lòng kiểm tra email.');
      setResendCooldown(60); // Bắt đầu 60s đếm ngược
    } catch (err) {
      console.error('Lỗi gửi lại OTP:', err);
      setOtpError(err.response?.data?.message || 'Lỗi khi gửi lại mã');
    } finally {
      setLoading(false);
    }
  };

  // THÊM MỚI: useEffect cho bộ đếm ngược
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [consultationId, user.id, user.role, navigate, isVerified]); // SỬA: Thêm isVerified

  // THÊM MỚI: Hàm xử lý xác thực OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otpInput) {
      setOtpError('Vui lòng nhập OTP');
      return;
    }
    
    try {
      setLoading(true); // Hiển thị loading
      await consultationService.verifyVideoOtp(consultationId, otpInput);
      setIsVerified(true); // Xác thực thành công!
      setLoading(false);
    } catch (err) {
      console.error('Lỗi xác thực OTP:', err);
      setOtpError(err.response?.data?.message || 'Lỗi không xác định');
      setLoading(false);
    }
  };

  // ✅ THÊM: Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const messages = await chatService.getChatHistory(consultationId);
        setChatMessages(messages);
      } catch (error) {
        console.error('❌ Lỗi tải lịch sử chat:', error);
      }
    };
    
    if (showChatBox && chatMessages.length === 0) {
      loadChatHistory();
    }
    
    // Lắng nghe tin nhắn mới qua WebSocket
    const handleNewMessage = (payload) => {
      setChatMessages(prev => [...prev, payload]);
    };
    
    chatService.on('new_message', handleNewMessage);
    
    return () => {
      chatService.off('new_message', handleNewMessage);
    };
  }, [showChatBox, consultationId, chatMessages.length]);

  // ✅ THÊM: Beauty Filter Effect
  useEffect(() => {
    if (beautyFilterLevel === 0 || !localVideoRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const video = localVideoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const applyBeautyFilter = () => {
      ctx.filter = `blur(${beautyFilterLevel / 50}px) brightness(${1 + beautyFilterLevel / 200})`;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animationFrameRef.current = requestAnimationFrame(applyBeautyFilter);
    };
    
    applyBeautyFilter();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [beautyFilterLevel]);


  // ========== TIMER ==========
  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== CÁC HÀM ĐIỀU KHIỂN ==========
  const handleToggleAudio = () => {
    if (!videoService.localStream) {
      console.warn('⚠️ Local stream chưa sẵn sàng');
      return;
    }
    
    const audioTrack = videoService.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('⚠️ Không tìm thấy audio track');
      return;
    }
    
    audioTrack.enabled = !audioTrack.enabled;
    setIsAudioMuted(!audioTrack.enabled);
    console.log('🎤 [VideoCall] Audio:', audioTrack.enabled ? 'BẬT' : 'TẮT');
  };

  const handleToggleVideo = () => {
    if (!videoService.localStream) {
      console.warn('⚠️ Local stream chưa sẵn sàng');
      return;
    }
    
    const videoTrack = videoService.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.warn('⚠️ Không tìm thấy video track');
      return;
    }
    
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoMuted(!videoTrack.enabled);
    
    console.log('📹 [VideoCall] Video:', videoTrack.enabled ? 'BẬT' : 'TẮT');
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = videoService.localStream;
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: false 
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Thay thế video track bằng screen track
        const sender = videoService.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        
        setIsScreenSharing(true);
        
        // Khi user dừng share từ browser
        screenTrack.onended = () => {
          handleStopScreenShare();
        };
        
      } else {
        handleStopScreenShare();
      }
    } catch (error) {
      console.error('❌ Lỗi chia sẻ màn hình:', error);
      alert('Không thể chia sẻ màn hình. Vui lòng thử lại.');
    }
  };

  const handleStopScreenShare = () => {
    const videoTrack = videoService.localStream.getVideoTracks()[0];
    const sender = videoService.peerConnection.getSenders().find(s => s.track?.kind === 'video');
    if (sender && videoTrack) {
      sender.replaceTrack(videoTrack);
    }
    setIsScreenSharing(false);
  };

  const handleHangUp = () => {
    if (window.confirm('Bạn có chắc muốn kết thúc cuộc gọi?')) {
      videoService.hangUp();
    }
  };

  // ✅ THÊM: CHAT BOX FUNCTIONS
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    try {
      const messageData = {
        consultation_id: consultationId,
        message_type: 'text',
        content: newMessage.trim()
      };
      
      await chatService.sendTextMessage(messageData);
      setNewMessage('');
    } catch (error) {
      console.error('❌ Lỗi gửi tin nhắn:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = chatService.validateFile(file, 5);
    if (!validation.isValid) {
      alert(Object.values(validation.errors).join('\n'));
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultation_id', consultationId);
      formData.append('message_type', 'image');
      
      await chatService.uploadFile(formData);
    } catch (error) {
      console.error('❌ Lỗi gửi ảnh:', error);
      alert('Không thể gửi ảnh. Vui lòng thử lại.');
    }
  };
  
  // ✅ THÊM: EMOJI REACTION FUNCTIONS
  const handleEmojiClick = (emoji) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji: emoji,
      left: Math.random() * 80 + 10, // 10-90%
      animationDuration: 3 + Math.random() * 2 // 3-5s
    };
    
    setFloatingEmojis(prev => [...prev, newEmoji]);
    
    // Xóa emoji sau khi animation kết thúc
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, newEmoji.animationDuration * 1000);
  };

  // ========== MODAL - BÁO CÁO SỰ CỐ ==========
  const handleSubmitReport = async () => {
    if (!reportType || !reportDescription.trim()) {
      alert('Vui lòng chọn loại sự cố và mô tả chi tiết');
      return;
    }
    
    try {
      await consultationService.createConsultationReport(consultationId, {
        report_type: reportType,
        description: reportDescription
      });
      
      alert('✅ Đã gửi báo cáo thành công. Admin sẽ xử lý sớm nhất.');
      setShowReportModal(false);
      setReportType('');
      setReportDescription('');
    } catch (error) {
      console.error('❌ Lỗi gửi báo cáo:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  // ========== RENDER ==========

if (loading) {
    return (
      <div className="video-call-room-page-loading">
        <div className="video-call-room-page-spinner"></div>
        <p>Đang tải phòng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-call-room-page-error">
        <FaExclamationTriangle />
        <h3>Lỗi kết nối</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/tu-van/lich-su')}>Quay lại</button>
      </div>
    );
  }


// THÊM MỚI: Màn hình nhập OTP cho Bệnh nhân
  if (!isVerified && user.role === 'patient') {
    return (
      <div className="video-call-room-page-loading"> {/* Tái sử dụng style loading */}
        <form className="video-call-room-page-otp-form" onSubmit={handleVerifyOtp}>
          <FaVideo />
          <h3>Xác thực Video Call</h3>
          <p>Vui lòng nhập mã OTP (6 số) đã được gửi đến email của bạn để vào phòng.</p>
          
          <input
            type="tel"
            maxLength="6"
            placeholder="------"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            className="video-call-room-page-otp-input"
          />
          
          {otpError && (
            <p className="video-call-room-page-otp-error">{otpError}</p>
          )}
          
          <button type="submit" disabled={loading} className="video-call-room-page-otp-button">
            {loading ? 'Đang kiểm tra...' : 'Xác nhận'}
          </button>

          {/* === THÊM KHỐI NÀY === */}
          <div className="video-call-room-page-otp-resend">
            {resendCooldown > 0 ? (
              <span>Vui lòng chờ {resendCooldown} giây</span>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); handleResendOtp(); }}>
                Không nhận được mã? Gửi lại
              </a>
            )}
          </div>
          {/* === KẾT THÚC KHỐI THÊM === */}

          <a href="#" onClick={() => navigate(-1)} className="video-call-room-page-otp-back">
            Quay lại
          </a>
        </form>
      </div>
    );
  }

  
  const otherUser = user.role === 'patient' ? consultation?.doctor : consultation?.patient;

  return (
    <div className="video-call-room-page-container">
      
      {/* ========== HEADER ========== */}
      <div className="video-call-room-page-header">
        <div className="video-call-room-page-user-info">
          {user.role === 'patient' ? <FaUserMd /> : <FaUser />}
          <span className="video-call-room-page-user-name">
            {user.role === 'patient' ? 'BS. ' : 'BN. '}{otherUser?.full_name}
          </span>
          <span className="video-call-room-page-separator">•</span>
          <span className="video-call-room-page-consultation-code">
            {consultation?.consultation_code}
          </span>
        </div>
        
        <div className="video-call-room-page-status-group">
          <div className={`video-call-room-page-connection-indicator ${connectionQuality}`}>
            <FaWifi />
          </div>
          
          {callStatus === 'Đang diễn ra' && (
            <div className="video-call-room-page-call-timer">
              <FaClock />
              <span>{formatDuration(callDuration)}</span>
            </div>
          )}
          
          <span className={`video-call-room-page-status-badge ${callStatus === 'Đang diễn ra' ? 'active' : ''}`}>
            {callStatus === 'Đang diễn ra' && <FaCheckCircle />}
            {callStatus}
          </span>
        </div>
      </div>

      {/* ========== VIDEO GRID ========== */}
      <div className="video-call-room-page-video-grid">
        {/* Video của người khác (toàn màn hình) */}
        <div className="video-call-room-page-video-wrapper video-call-room-page-remote">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            muted={false}
            className="video-call-room-page-remote-video"
          />
          {callStatus !== 'Đang diễn ra' && (
            <div className="video-call-room-page-overlay">
              <div className="video-call-room-page-overlay-content">
                <div className="video-call-room-page-spinner"></div>
                <p>{callStatus}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Video của mình (nhỏ ở góc) */}
        <div className="video-call-room-page-video-wrapper video-call-room-page-local">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="video-call-room-page-local-video"
          />
          {isVideoMuted && (
            <div className="video-call-room-page-video-off-overlay">
              <FaVideoSlash />
              <p>Camera tắt</p>
            </div>
          )}
          <div className="video-call-room-page-local-label">
            Bạn
          </div>
        </div>
      </div>

      {/* ========== CONTROLS ========== */}
      <div className="video-call-room-page-controls">
        <div className="video-call-room-page-controls-left">
          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
            onClick={() => setShowInfoModal(true)}
            title="Thông tin cuộc gọi"
          >
            <FaInfoCircle />
          </button>
          
          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
            onClick={() => setShowReportModal(true)}
            title="Báo cáo sự cố"
          >
            <FaExclamationTriangle />
          </button>
        </div>
        
        <div className="video-call-room-page-controls-center">
          <button 
            className={`video-call-room-page-control-btn ${isAudioMuted ? 'video-call-room-page-control-btn-muted' : ''}`}
            onClick={handleToggleAudio}
            title={isAudioMuted ? 'Bật Mic' : 'Tắt Mic'}
          >
            {isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>

          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-hangup"
            onClick={handleHangUp}
            title="Kết thúc"
          >
            <FaPhoneSlash />
          </button>

          <button 
            className={`video-call-room-page-control-btn ${isVideoMuted ? 'video-call-room-page-control-btn-muted' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
          >
            {isVideoMuted ? <FaVideoSlash /> : <FaVideo />}
          </button>
        </div>
        
       <div className="video-call-room-page-controls-right">
          <button 
            className={`video-call-room-page-control-btn video-call-room-page-control-btn-secondary ${isScreenSharing ? 'video-call-room-page-control-btn-active' : ''}`}
            onClick={handleScreenShare}
            title="Chia sẻ màn hình"
          >
            <FaDesktop />
          </button>
          
          <button 
            className={`video-call-room-page-control-btn video-call-room-page-control-btn-secondary ${showChatBox ? 'video-call-room-page-control-btn-active' : ''}`}
            onClick={() => setShowChatBox(!showChatBox)}
            title="Chat"
          >
            <FaComments />
          </button>
          
          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
            onClick={() => setBeautyFilterLevel(prev => (prev + 25) % 125)}
            title={`Làm đẹp: ${beautyFilterLevel}%`}
          >
            <FaMagic />
          </button>
        </div>
      </div>

      {/* ========== MODAL - THÔNG TIN CUỘC GỌI ========== */}
      {showInfoModal && (
        <div className="video-call-room-page-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="video-call-room-page-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-call-room-page-modal-header">
              <h3><FaInfoCircle /> Thông tin cuộc gọi</h3>
              <button onClick={() => setShowInfoModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="video-call-room-page-modal-body">
              <div className="video-call-room-page-info-row">
                <label>Mã tư vấn:</label>
                <span>{consultation?.consultation_code}</span>
              </div>
              
              <div className="video-call-room-page-info-row">
                <label>{user.role === 'patient' ? 'Bác sĩ:' : 'Bệnh nhân:'}</label>
                <span>{otherUser?.full_name}</span>
              </div>
              
              <div className="video-call-room-page-info-row">
                <label>Thời gian hẹn:</label>
                <span>{new Date(consultation?.appointment_time).toLocaleString('vi-VN')}</span>
              </div>
              
              {callStatus === 'Đang diễn ra' && (
                <div className="video-call-room-page-info-row">
                  <label>Thời lượng:</label>
                  <span>{formatDuration(callDuration)}</span>
                </div>
              )}
              
              <div className="video-call-room-page-info-row">
                <label>Trạng thái:</label>
                <span className="video-call-room-page-status-badge-small">{callStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL - BÁO CÁO SỰ CỐ ========== */}
      {showReportModal && (
        <div className="video-call-room-page-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="video-call-room-page-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-call-room-page-modal-header">
              <h3><FaExclamationTriangle /> Báo cáo sự cố</h3>
              <button onClick={() => setShowReportModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="video-call-room-page-modal-body">
              <div className="video-call-room-page-form-group">
                <label>Loại sự cố: <span className="video-call-room-page-required">*</span></label>
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="video-call-room-page-select"
                >
                  <option value="">-- Chọn loại sự cố --</option>
                  <option value="no_video">Không thấy hình ảnh</option>
                  <option value="no_audio">Không nghe thấy tiếng</option>
                  <option value="connection_lost">Mất kết nối</option>
                  <option value="poor_quality">Chất lượng kém</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              
              <div className="video-call-room-page-form-group">
                <label>Mô tả chi tiết: <span className="video-call-room-page-required">*</span></label>
                <textarea 
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết sự cố..."
                  rows="4"
                  className="video-call-room-page-textarea"
                />
              </div>
              
              <div className="video-call-room-page-modal-actions">
                <button 
                  className="video-call-room-page-btn video-call-room-page-btn-secondary"
                  onClick={() => setShowReportModal(false)}
                >
                  Hủy
                </button>
                <button 
                  className="video-call-room-page-btn video-call-room-page-btn-primary"
                  onClick={handleSubmitReport}
                >
                  Gửi báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CHAT BOX ========== */}
      {showChatBox && (
        <div className="video-call-room-page-chat-box">
          <div className="video-call-room-page-chat-header">
            <h4><FaComments /> Chat</h4>
            <button onClick={() => setShowChatBox(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="video-call-room-page-chat-body">
            {chatMessages.map((msg, index) => (
              <div 
                key={msg.id || index}
                className={`video-call-room-page-chat-message ${
                  msg.sender_id === user.id ? 'video-call-room-page-chat-message-own' : ''
                }`}
              >
                {msg.sender_id !== user.id && (
                  <div className="video-call-room-page-chat-avatar">
                    {msg.sender?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="video-call-room-page-chat-content">
                  {msg.message_type === 'image' ? (
                    <img src={msg.file_url} alt="Hình ảnh" />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <span className="video-call-room-page-chat-time">
                    {chatService.formatDetailedTime(msg.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="video-call-room-page-chat-footer">
            <input
              type="file"
              accept="image/*"
              onChange={handleSendImage}
              style={{ display: 'none' }}
              id="chat-image-upload"
            />
            <label htmlFor="chat-image-upload" className="video-call-room-page-chat-icon-btn">
              <FaImage />
            </label>
            
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isSendingMessage}
            />
            
            <button 
              onClick={handleSendMessage}
              disabled={isSendingMessage || !newMessage.trim()}
              className="video-call-room-page-chat-send-btn"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}

      {/* ========== EMOJI REACTIONS ========== */}
      <div className="video-call-room-page-emoji-panel">
        {emojiReactions.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleEmojiClick(emoji)}
            className="video-call-room-page-emoji-btn"
          >
            {emoji}
          </button>
        ))}
      </div>
      
      {/* Floating Emojis */}
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className="video-call-room-page-floating-emoji"
          style={{
            left: `${item.left}%`,
            animationDuration: `${item.animationDuration}s`
          }}
        >
          {item.emoji}
        </div>
      ))}
      
      {/* ========== BEAUTY FILTER CANVAS ========== */}
      {beautyFilterLevel > 0 && (
        <canvas
          ref={canvasRef}
          className="video-call-room-page-beauty-canvas"
        />
      )}

    </div>
  );
};

export default VideoCallRoomPage;
