// client/src/services/videoService.js
// Dịch vụ xử lý logic WebRTC (Video Call)

import chatService from './chatService';

// Cấu hình máy chủ STUN (miễn phí của Google)
// Trong môi trường production, bạn CẦN một máy chủ TURN
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // { 
    //   urls: 'turn:your-turn-server.com:3478', 
    //   username: 'user', 
    //   credential: 'password' 
    // }
  ],
};

class VideoService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.consultationId = null;

    // Callbacks
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
  }

  /**
   * Khởi tạo một Peer Connection mới
   */
  async createPeerConnection(consultationId) {
  this.consultationId = consultationId;
  
  // ✅ SỬA: Đăng ký callback TRƯỚC KHI tạo PeerConnection
  // Để không bỏ lỡ bất kỳ signal nào từ phía bên kia
  chatService.on('webrtc_offer', this.handleOffer.bind(this));
  chatService.on('webrtc_answer', this.handleAnswer.bind(this));
  chatService.on('webrtc_ice_candidate', this.handleICECandidate.bind(this));
  
  this.peerConnection = new RTCPeerConnection(rtcConfig);

  // 1. Thêm stream nội bộ vào connection
this.localStream.getTracks().forEach(track => {
  console.log(`➕ [WebRTC] Đang thêm ${track.kind} track vào PeerConnection`);
  this.peerConnection.addTrack(track, this.localStream);
});

// ✅ THÊM: Kiểm tra xem tracks đã được thêm chưa
const senders = this.peerConnection.getSenders();
console.log('📤 [WebRTC] Tổng số tracks đã thêm:', senders.length);
senders.forEach(sender => {
  console.log(`  - ${sender.track?.kind || 'unknown'} track`);
});

  // 2. Lắng nghe khi stream từ xa được thêm vào
        this.peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Nhận được remote stream');
        if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
            
            // ✅ THÊM: Debug audio tracks
            const audioTracks = this.remoteStream.getAudioTracks();
            const videoTracks = this.remoteStream.getVideoTracks();
            console.log('🎤 [WebRTC] Audio tracks:', audioTracks.length, audioTracks);
            console.log('📹 [WebRTC] Video tracks:', videoTracks.length, videoTracks);
            
            if (this.onRemoteStream) {
            this.onRemoteStream(this.remoteStream);
            }
        }
        };

  // 3. Lắng nghe ICE candidates
  this.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      chatService.sendWebRTCICECandidate(this.consultationId, event.candidate);
    }
  };
}

  /**
 * Bắt đầu: Lấy camera/mic
 */
async startLocalStream() {
  try {
    console.log('🎥 [WebRTC] Đang yêu cầu camera + mic...');
    
    this.localStream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    // ✅ THÊM: Debug tracks
    const audioTracks = this.localStream.getAudioTracks();
    const videoTracks = this.localStream.getVideoTracks();
    console.log('✅ [WebRTC] Local stream ready:');
    console.log('  🎤 Audio tracks:', audioTracks.length, audioTracks);
    console.log('  📹 Video tracks:', videoTracks.length, videoTracks);
    
    if (this.onLocalStream) {
      this.onLocalStream(this.localStream);
    }
  } catch (error) {
    console.error('❌ Không thể lấy camera/mic:', error);
    
    // ✅ THÊM: Thông báo chi tiết
    if (error.name === 'NotAllowedError') {
      alert('❌ Bạn đã từ chối quyền truy cập camera/mic. Vui lòng cấp quyền trong cài đặt trình duyệt.');
    } else if (error.name === 'NotFoundError') {
      alert('❌ Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị.');
    } else {
      alert('❌ Không thể truy cập camera/mic: ' + error.message);
    }
    
    throw error;
  }
}
  /**
   * Người gọi: Tạo và gửi Offer
   */
  async createOffer() {
  if (!this.peerConnection) {
    console.error('❌ [WebRTC] Cannot create offer: peerConnection is null');
    return;
  }
  try {
    console.log('📤 [WebRTC] Creating offer...');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    
    // Gửi offer qua WebSocket
    chatService.sendWebRTCOffer(this.consultationId, this.peerConnection.localDescription);
    console.log('✅ [WebRTC] Offer sent successfully');
  } catch (error) {
    console.error('❌ [WebRTC] Error creating offer:', error);
  }
}

  /**
   * Người nhận: Xử lý Offer (từ WebSocket)
   */
  async handleOffer(payload) {
    if (!this.peerConnection || !payload.sdp) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      console.log('[WebRTC] Đã nhận và set Remote Offer');

      // Tạo Answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Gửi Answer qua WebSocket
      chatService.sendWebRTCAnswer(this.consultationId, this.peerConnection.localDescription);
      console.log('[WebRTC] Đã gửi Answer');
    } catch (error) {
      console.error('Lỗi khi xử lý Offer:', error);
    }
  }

  /**
   * Người gọi: Xử lý Answer (từ WebSocket)
   */
  async handleAnswer(payload) {
    if (!this.peerConnection || !payload.sdp) return;

    // ===== SỬA: Thêm kiểm tra trạng thái =====
    const currentState = this.peerConnection.signalingState;
    console.log(`[WebRTC] Nhận Answer. Trạng thái hiện tại: ${currentState}`);

    if (currentState !== 'have-local-offer') {
       console.warn(`[WebRTC] Bỏ qua Answer vì trạng thái là ${currentState}, không phải "have-local-offer"`);
       return; 
    }
    // ===== KẾT THÚC SỬA =====

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      console.log('[WebRTC] Đã nhận và set Remote Answer. Trạng thái mới: stable');
    } catch (error) {
      console.error('Lỗi khi xử lý Answer:', error);
    }
  }

  /**
   * Cả hai: Xử lý ICE Candidate (từ WebSocket)
   */
  async handleICECandidate(payload) {
    if (!this.peerConnection || !payload.candidate) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
      // console.log('[WebRTC] Đã thêm ICE Candidate');
    } catch (error) {
      // Bỏ qua lỗi này
    }
  }

  /**
   * Kết thúc cuộc gọi
   */
  hangUp() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    
    // Hủy lắng nghe
    chatService.off('webrtc_offer', this.handleOffer);
    chatService.off('webrtc_answer', this.handleAnswer);
    chatService.off('webrtc_ice_candidate', this.handleICECandidate);

    if (this.onCallEnded) {
      this.onCallEnded();
    }
    console.log('[WebRTC] Đã kết thúc cuộc gọi');
  }

  // Các hàm điều khiển (Tắt/Bật Mic/Video)
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled; // Trả về trạng thái mới
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled; // Trả về trạng thái mới
      }
    }
    return false;
  }
}

// Xuất ra một instance duy nhất (singleton)
const videoService = new VideoService();
export default videoService;