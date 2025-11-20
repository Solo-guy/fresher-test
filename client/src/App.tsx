import { Layout } from 'antd';
import { useAuth } from './context/AuthContext';
import LoginPanel from './features/auth/LoginPanel';
import DashboardPage from './features/dashboard/DashboardPage';

const { Header, Content } = Layout;

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout className="app-shell">
      <Header
        style={{
          borderRadius: 16,
          background: '#fff',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          fontWeight: 600,
        }}
      >
        Web Quản Lý Chi Tiêu
      </Header>
      <Content>
        {isAuthenticated ? <DashboardPage /> : <LoginPanel />}
      </Content>
    </Layout>
  );
};

export default App;


