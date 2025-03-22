import { Layout, Card, Statistic, Button, List, Typography, Space } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { addMigration, updateStats } from "/src/redux/migrationsSlice.js";
import { v4 as uuidv4 } from 'uuid';
import TopNavBar from '../components/TopNavBar';

const { Content } = Layout;
const { Title } = Typography;

const Dashboard = () => {
  const dispatch = useDispatch();
  const { totalMigrations, successfulMigrations, failedMigrations, logs } = useSelector((state) => state.migrations);

  // Simulate Migration
  const handleMigration = (type) => {
    const success = Math.random() > 0.2; // 80% success rate
    const logEntry = {
      id: uuidv4(),
      message: `${type} migration ${success ? 'successful' : 'failed'}`,
      status: success ? 'success' : 'error',
    };

    dispatch(addMigration(logEntry));
    dispatch(updateStats({ total: 1, successful: success ? 1 : 0, failed: success ? 0 : 1 }));
  };

  return (
    <Layout>
      <TopNavBar />
      <Content style={{ padding: '20px' }}>
        {/* Stats Cards */}
        <Space style={{ display: 'flex', marginBottom: '20px' }}>
          <Card>
            <Statistic title="Total Migrations" value={totalMigrations} prefix={<SyncOutlined />} />
          </Card>
          <Card>
            <Statistic title="Successful Migrations" value={successfulMigrations} prefix={<CheckCircleOutlined />} />
          </Card>
          <Card>
            <Statistic title="Failed Migrations" value={failedMigrations} prefix={<CloseCircleOutlined />} />
          </Card>
        </Space>

        {/* Migration Actions */}
        <Space style={{ marginBottom: '20px' }}>
          <Button type="primary" onClick={() => handleMigration('Full')} icon={<SyncOutlined />}>
            Migrate All
          </Button>
          <Button onClick={() => handleMigration('Single Table')}>Migrate Single Table</Button>
          <Button onClick={() => handleMigration('Update Table')}>Update Table</Button>
        </Space>

{/* Logs Section */}
<Card title="Migration Logs">
  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
    <List
      bordered
      dataSource={logs}
      renderItem={(item) => (
        <List.Item style={{ color: item.status === 'success' ? 'green' : 'red' }}>
          {item.message}
        </List.Item>
      )}
    />
  </div>
</Card>

      </Content>
    </Layout>
  );
};

export default Dashboard;
