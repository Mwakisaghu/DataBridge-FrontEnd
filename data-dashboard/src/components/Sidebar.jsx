import { Layout, Menu } from 'antd';
import { DashboardOutlined, DatabaseOutlined, FileTextOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Sider } = Layout;

const Sidebar = () => {
  return (
    <Sider theme="dark">
      <Menu theme="dark" mode="vertical" defaultSelectedKeys={['1']}>
        <Menu.Item key="1" icon={<DashboardOutlined />}>
          <Link to="/">Dashboard</Link>
        </Menu.Item>
        <Menu.Item key="2" icon={<DatabaseOutlined />}>
          <Link to="/migrations">Validation</Link>
        </Menu.Item>
        <Menu.Item key="3" icon={<FileTextOutlined />}>
          <Link to="/logs">Logs</Link>
        </Menu.Item>
        <Menu.Item key="4" icon={<BarChartOutlined />}>
          <Link to="/reports">Reports</Link> {/* ✅ Added Reports Section */}
        </Menu.Item>
        <Menu.Item key="5" icon={<SettingOutlined />}>
          <Link to="/settings">Settings</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default Sidebar;
