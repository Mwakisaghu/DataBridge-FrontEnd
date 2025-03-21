import { Layout, Menu, Dropdown, Badge, Avatar, Space, Typography } from 'antd';
import { BellOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const profileMenu = (
  <Menu>
    <Menu.Item key="1">Profile</Menu.Item>
    <Menu.Item key="2">Logout</Menu.Item>
  </Menu>
);

const TopNavBar = () => {
  return (
    <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0 20px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
      {/* App Title */}
      <Title level={3} style={{ margin: 0 }}>Data Migration Dashboard</Title>

      {/* Right Side Icons */}
      <Space size="large">
        {/* Notifications */}
        <Badge count={3}>
          <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
        </Badge>

        {/* Settings */}
        <SettingOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />

        {/* Profile Dropdown */}
        <Dropdown overlay={profileMenu} placement="bottomRight">
          <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
        </Dropdown>
      </Space>
    </Header>
  );
};

export default TopNavBar;
