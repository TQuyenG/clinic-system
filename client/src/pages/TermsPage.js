import React from 'react';
import { FaFileContract, FaUserCheck, FaMoneyBillWave, FaCalendarAlt, FaBan, FaShieldAlt } from 'react-icons/fa';
import './TermsPage.css';

const TermsPage = () => {
  const termsSections = [
    {
      icon: <FaUserCheck />,
      title: 'Điều khoản sử dụng dịch vụ',
      items: [
        {
          subtitle: 'Đăng ký tài khoản',
          content: 'Bạn phải đủ 18 tuổi hoặc có sự đồng ý của cha mẹ/người giám hộ để đăng ký tài khoản. Thông tin cung cấp phải chính xác và đầy đủ. Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình.'
        },
        {
          subtitle: 'Quyền sử dụng',
          content: 'Chúng tôi cấp cho bạn quyền sử dụng dịch vụ với mục đích cá nhân, phi thương mại. Bạn không được sao chép, sửa đổi, phân phối nội dung mà không có sự cho phép.'
        },
        {
          subtitle: 'Hành vi bị cấm',
          content: 'Không sử dụng dịch vụ cho mục đích bất hợp pháp. Không cung cấp thông tin sai lệch hoặc giả mạo. Không quấy rối, lạm dụng, hoặc xâm phạm quyền của người khác. Không truyền tải virus, malware hoặc mã độc hại.'
        },
        {
          subtitle: 'Chấm dứt tài khoản',
          content: 'Chúng tôi có quyền tạm ngừng hoặc chấm dứt tài khoản của bạn nếu vi phạm điều khoản. Bạn có thể tự xóa tài khoản bất kỳ lúc nào bằng cách liên hệ với chúng tôi.'
        }
      ]
    },
    {
      icon: <FaCalendarAlt />,
      title: 'Chính sách đặt lịch hẹn',
      items: [
        {
          subtitle: 'Đặt lịch',
          content: 'Lịch hẹn có thể được đặt qua website, điện thoại, hoặc trực tiếp tại bệnh viện. Bạn sẽ nhận được xác nhận qua email hoặc SMS. Vui lòng đến trước giờ hẹn 15 phút để hoàn tất thủ tục.'
        },
        {
          subtitle: 'Hủy và đổi lịch',
          content: 'Bạn có thể hủy hoặc đổi lịch hẹn miễn phí nếu thông báo trước ít nhất 24 giờ. Hủy muộn hơn 24 giờ có thể bị tính phí 50% chi phí dịch vụ. Không đến khám mà không thông báo sẽ bị tính 100% phí.'
        },
        {
          subtitle: 'Trễ hẹn',
          content: 'Nếu bạn đến muộn quá 15 phút, chúng tôi có thể phải hủy lịch hẹn và sắp xếp lại. Chúng tôi sẽ cố gắng sắp xếp lại trong ngày nếu có thể.'
        },
        {
          subtitle: 'Khám khẩn cấp',
          content: 'Phòng cấp cứu không cần đặt lịch trước. Các trường hợp cấp cứu được ưu tiên xử lý ngay lập tức.'
        }
      ]
    },
    {
      icon: <FaMoneyBillWave />,
      title: 'Thanh toán và hoàn tiền',
      items: [
        {
          subtitle: 'Phương thức thanh toán',
          content: 'Chấp nhận: Tiền mặt, thẻ ATM, thẻ tín dụng (Visa, Mastercard), chuyển khoản, ví điện tử (Momo, ZaloPay), bảo hiểm y tế.'
        },
        {
          subtitle: 'Chi phí dịch vụ',
          content: 'Giá dịch vụ được công khai trên website và tại quầy lễ tân. Giá có thể thay đổi theo thời gian mà không cần thông báo trước. Bạn sẽ được thông báo chi phí cụ thể trước khi sử dụng dịch vụ.'
        },
        {
          subtitle: 'Bảo hiểm y tế',
          content: 'Chúng tôi chấp nhận hầu hết các loại bảo hiểm y tế. Vui lòng mang theo thẻ bảo hiểm khi đến khám. Phần chi phí không được bảo hiểm chi trả sẽ do bạn thanh toán.'
        },
        {
          subtitle: 'Chính sách hoàn tiền',
          content: 'Hoàn tiền 100% nếu hủy lịch trước 24 giờ. Hoàn tiền 50% nếu hủy trong vòng 24 giờ. Không hoàn tiền nếu không đến khám mà không báo. Hoàn tiền trong vòng 7-14 ngày làm việc.'
        }
      ]
    },
    {
      icon: <FaShieldAlt />,
      title: 'Trách nhiệm và giới hạn trách nhiệm',
      items: [
        {
          subtitle: 'Trách nhiệm của bệnh viện',
          content: 'Chúng tôi cam kết cung cấp dịch vụ y tế chất lượng cao theo tiêu chuẩn chuyên môn. Chúng tôi có trách nhiệm bảo mật thông tin cá nhân và y tế của bạn. Chúng tôi có bảo hiểm trách nhiệm nghề nghiệp.'
        },
        {
          subtitle: 'Trách nhiệm của bệnh nhân',
          content: 'Cung cấp thông tin y tế chính xác và đầy đủ. Tuân thủ hướng dẫn điều trị của bác sĩ. Thông báo kịp thời nếu có phản ứng bất thường với thuốc hoặc điều trị. Thanh toán đầy đủ chi phí dịch vụ.'
        },
        {
          subtitle: 'Giới hạn trách nhiệm',
          content: 'Chúng tôi không chịu trách nhiệm về kết quả điều trị do bệnh nhân không tuân thủ chỉ định. Không chịu trách nhiệm về các biến chứng không thể lường trước được. Không chịu trách nhiệm về thất thoát tài sản cá nhân tại bệnh viện.'
        },
        {
          subtitle: 'Bồi thường',
          content: 'Trong trường hợp sai sót y khoa được chứng minh, chúng tôi sẽ bồi thường theo quy định pháp luật. Mức bồi thường tối đa theo hợp đồng bảo hiểm trách nhiệm nghề nghiệp.'
        }
      ]
    },
    {
      icon: <FaBan />,
      title: 'Quyền sở hữu trí tuệ',
      items: [
        {
          subtitle: 'Nội dung website',
          content: 'Tất cả nội dung trên website (văn bản, hình ảnh, logo, video) thuộc quyền sở hữu của chúng tôi hoặc được cấp phép sử dụng. Bạn không được sao chép, sửa đổi, hoặc phân phối mà không có sự cho phép.'
        },
        {
          subtitle: 'Nhãn hiệu',
          content: 'Tên và logo của bệnh viện là nhãn hiệu đã đăng ký. Việc sử dụng trái phép có thể bị xử lý theo pháp luật.'
        },
        {
          subtitle: 'Nội dung người dùng',
          content: 'Khi bạn gửi đánh giá, bình luận, hoặc nội dung khác, bạn cấp cho chúng tôi quyền sử dụng, hiển thị, và phân phối nội dung đó. Bạn chịu trách nhiệm về nội dung mình đăng tải.'
        }
      ]
    },
    {
      icon: <FaFileContract />,
      title: 'Điều khoản chung',
      items: [
        {
          subtitle: 'Thay đổi điều khoản',
          content: 'Chúng tôi có quyền thay đổi điều khoản này bất kỳ lúc nào. Các thay đổi quan trọng sẽ được thông báo qua email hoặc trên website. Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.'
        },
        {
          subtitle: 'Luật áp dụng',
          content: 'Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết tại tòa án có thẩm quyền tại TP. Hồ Chí Minh.'
        },
        {
          subtitle: 'Tính độc lập của điều khoản',
          content: 'Nếu bất kỳ điều khoản nào bị tòa án tuyên bố không hợp lệ, các điều khoản còn lại vẫn có hiệu lực.'
        },
        {
          subtitle: 'Liên hệ',
          content: 'Nếu có câu hỏi về các điều khoản này, vui lòng liên hệ: Email: legal@clinic.vn, Điện thoại: (028) 3822 1234.'
        }
      ]
    }
  ];

  return (
    <div className="terms-page">
      {/* Hero */}
      <section className="terms-hero">
        <div className="container">
          <FaFileContract className="hero-icon" />
          <h1>Điều khoản dịch vụ</h1>
          <p className="hero-subtitle">
            Vui lòng đọc kỹ các điều khoản trước khi sử dụng dịch vụ của chúng tôi
          </p>
          <p className="last-updated">Có hiệu lực từ: 01/01/2025</p>
        </div>
      </section>

      {/* Introduction */}
      <section className="terms-intro">
        <div className="container">
          <div className="intro-box">
            <h2>Chào mừng đến với Phòng khám Đa khoa</h2>
            <p>
              Các điều khoản dịch vụ này điều chỉnh việc bạn sử dụng website và dịch vụ y tế của chúng tôi. 
              Bằng việc sử dụng dịch vụ, bạn đồng ý tuân thủ các điều khoản này. Nếu không đồng ý, 
              vui lòng không sử dụng dịch vụ của chúng tôi.
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="terms-content">
        <div className="container">
          {termsSections.map((section, index) => (
            <div key={index} className="terms-section">
              <div className="section-header">
                {section.icon}
                <h2>{section.title}</h2>
              </div>
              <div className="section-items">
                {section.items.map((item, idx) => (
                  <div key={idx} className="terms-item">
                    <h3>{item.subtitle}</h3>
                    <p>{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Acceptance */}
      <section className="terms-acceptance">
        <div className="container">
          <div className="acceptance-box">
            <FaUserCheck className="acceptance-icon" />
            <h2>Chấp nhận điều khoản</h2>
            <p>
              Bằng việc tạo tài khoản hoặc sử dụng bất kỳ dịch vụ nào của chúng tôi, 
              bạn xác nhận rằng đã đọc, hiểu và đồng ý với tất cả các điều khoản nêu trên. 
              Nếu có câu hỏi, vui lòng liên hệ với chúng tôi trước khi sử dụng dịch vụ.
            </p>
            <div className="acceptance-buttons">
              <button className="btn-agree">Tôi đồng ý</button>
              <button className="btn-print">In điều khoản</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;