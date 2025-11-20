import { Card, Typography, message } from 'antd';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { loginWithGoogle } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { Title, Paragraph } = Typography;

export const LoginPanel = () => {
  const { login } = useAuth();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: loginWithGoogle,
  });

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('Không nhận được credential từ Google');
      }
      const data = await mutateAsync(credentialResponse.credential);
      login({ token: data.token, user: data.user });
      queryClient.setQueryData(['wallets'], {
        wallets: data.wallets,
        totalBalance: data.totalBalance,
      });
      message.success('Đăng nhập thành công');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      message.error('Không thể đăng nhập. Vui lòng thử lại.');
    }
  };

  const handleError = () => {
    message.error('Đăng nhập Google thất bại');
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', paddingTop: 120 }}>
      <Card className="section-card">
        <Title level={3}>Web Quản Lý Chi Tiêu</Title>
        <Paragraph>Ghi chép thu chi nhanh chóng, bảo mật bằng Google.</Paragraph>
        <GoogleLogin onSuccess={handleSuccess} onError={handleError} useOneTap />
        {isPending && <Paragraph>Đang xác thực...</Paragraph>}
      </Card>
    </div>
  );
};

export default LoginPanel;


