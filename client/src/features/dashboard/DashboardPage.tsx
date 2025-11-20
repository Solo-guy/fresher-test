import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  Row,
  Col,
} from 'antd';
import {
  FileExcelOutlined,
  FilePdfOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import {
  createTransaction,
  createWallet,
  exportStatementFile,
  fetchStatement,
  fetchTransactions,
  fetchWallets,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Transaction } from '../../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const currency = (value: number) =>
  value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [transactionForm] = Form.useForm();
  const [walletForm] = Form.useForm();
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>();
  const [transactionPagination, setTransactionPagination] = useState({
    current: 1,
    pageSize: 50,
  });
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(null);

  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: fetchWallets,
  });

  const wallets = walletsQuery.data?.wallets ?? [];
  const totalBalance = walletsQuery.data?.totalBalance ?? 0;

  useEffect(() => {
    if (!selectedWalletId && wallets.length > 0) {
      setSelectedWalletId(wallets[0]._id);
    }
  }, [wallets, selectedWalletId]);

  useEffect(() => {
    if (selectedWalletId) {
      transactionForm.setFieldsValue({ walletId: selectedWalletId });
    }
  }, [selectedWalletId, transactionForm]);

  const rangeKey = useMemo(
    () => `${range[0]?.valueOf() ?? ''}-${range[1]?.valueOf() ?? ''}`,
    [range],
  );

  useEffect(() => {
    setTransactionPagination((prev) => ({ ...prev, current: 1 }));
  }, [selectedWalletId, typeFilter, rangeKey]);

  const transactionFilters = useMemo(
    () => ({
      walletId: selectedWalletId,
      startDate: range[0]?.toISOString(),
      endDate: range[1]?.toISOString(),
      type: typeFilter,
      page: transactionPagination.current,
      limit: transactionPagination.pageSize,
    }),
    [
      selectedWalletId,
      range[0]?.valueOf(),
      range[1]?.valueOf(),
      typeFilter,
      transactionPagination.current,
      transactionPagination.pageSize,
    ],
  );

  const transactionsQuery = useQuery({
    queryKey: ['transactions', transactionFilters],
    queryFn: () => fetchTransactions(transactionFilters),
    enabled: Boolean(selectedWalletId),
  });

  const statementQuery = useQuery({
    queryKey: ['statement', selectedWalletId, range],
    queryFn: () =>
      fetchStatement({
        walletId: selectedWalletId!,
        startDate: range[0]?.toISOString(),
        endDate: range[1]?.toISOString(),
      }),
    enabled: Boolean(selectedWalletId),
  });

  const createWalletMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      message.success('Tạo ví thành công');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      walletForm.resetFields();
      setWalletModalOpen(false);
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      message.success('Ghi giao dịch thành công');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['statement'] });
      transactionForm.resetFields();
    },
  });

  const handleWalletSubmit = () => {
    walletForm.validateFields().then((values) => {
      createWalletMutation.mutate({
        ...values,
        initialBalance: Number(values.initialBalance),
        openedAt: values.openedAt.toISOString(),
      });
    });
  };

  const handleTransactionSubmit = () => {
    transactionForm.validateFields().then((values) => {
      createTransactionMutation.mutate({
        walletId: values.walletId,
        type: values.type,
        amount: Number(values.amount),
        category: values.category,
        date: values.date.toISOString(),
        note: values.note,
      });
    });
  };

  const transactions = transactionsQuery.data?.transactions ?? [];
  const transactionTotal = transactionsQuery.data?.total ?? 0;

  const handleTransactionsPagination = (page: number, pageSize: number) => {
    setTransactionPagination({ current: page, pageSize });
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    if (!selectedWalletId) {
      return;
    }
    setExportingFormat(format);
    try {
      const blob = await exportStatementFile({
        walletId: selectedWalletId,
        startDate: range[0]?.toISOString(),
        endDate: range[1]?.toISOString(),
        format,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fromLabel = range[0]?.format('YYYYMMDD') ?? 'from';
      const toLabel = range[1]?.format('YYYYMMDD') ?? 'to';
      link.href = url;
      link.download = `statement-${fromLabel}-${toLabel}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(`Đã xuất sao kê ${format.toUpperCase()}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      message.error('Không thể xuất sao kê, vui lòng thử lại.');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            Xin chào, {user?.name}
          </Title>
          <Text type="secondary">{user?.email}</Text>
        </Col>
        <Col>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            Đăng xuất
          </Button>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card className="section-card">
            <Statistic title="Tổng số dư" value={totalBalance} prefix="₫" valueStyle={{ fontSize: 36 }} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              style={{ marginTop: 16 }}
              onClick={() => setWalletModalOpen(true)}
            >
              Thêm ví
            </Button>
            <div className="wallet-list" style={{ marginTop: 16 }}>
              {wallets.map((wallet) => (
                <div
                  key={wallet._id}
                  className="wallet-card"
                  onClick={() => setSelectedWalletId(wallet._id)}
                  style={{
                    borderColor: selectedWalletId === wallet._id ? '#1677ff' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong>{wallet.name}</Text>
                      <div>
                        <Text type="secondary">{wallet.accountNumber ?? 'Không có STK'}</Text>
                      </div>
                    </Col>
                    <Col>
                      <Text>{currency(wallet.balance)}</Text>
                    </Col>
                  </Row>
                  <Text type="secondary">
                    Mở {dayjs(wallet.openedAt).format('DD/MM/YYYY')}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={16}>
          <Card className="section-card">
            <Title level={4}>Ghi chép giao dịch</Title>
            <Form
              layout="vertical"
              form={transactionForm}
              initialValues={{ type: 'expense', walletId: selectedWalletId, date: dayjs() }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Ví" name="walletId" rules={[{ required: true, message: 'Chọn ví' }]}>
                    <Select
                      options={wallets.map((wallet) => ({ label: wallet.name, value: wallet._id }))}
                      placeholder="Chọn ví"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Loại" name="type" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { label: 'Khoản thu', value: 'income' },
                        { label: 'Khoản chi', value: 'expense' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Số tiền" name="amount" rules={[{ required: true }]}>
                    <InputNumber
                      min={0}
                      prefix="₫"
                      style={{ width: '100%' }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Danh mục" name="category" rules={[{ required: true }]}>
                    <Input placeholder="Ví dụ: Ăn uống" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Ngày" name="date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Ghi chú" name="note">
                <Input.TextArea rows={2} placeholder="Thêm ghi chú" />
              </Form.Item>
              <Button
                type="primary"
                onClick={handleTransactionSubmit}
                loading={createTransactionMutation.isPending}
              >
                Lưu giao dịch
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card className="section-card">
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={4}>Lịch sử giao dịch</Title>
              </Col>
              <Col>
                <Space>
                  <Select
                    style={{ width: 160 }}
                    value={typeFilter}
                    allowClear
                    placeholder="Tất cả loại"
                    onChange={(value) => setTypeFilter(value)}
                    options={[
                      { label: 'Khoản thu', value: 'income' },
                      { label: 'Khoản chi', value: 'expense' },
                    ]}
                  />
                  <RangePicker
                    value={range}
                    onChange={(values) => {
                      if (values) {
                        setRange(values as [Dayjs, Dayjs]);
                      } else {
                        setRange([dayjs().startOf('month'), dayjs()]);
                      }
                    }}
                    format="DD/MM/YYYY"
                  />
                </Space>
              </Col>
            </Row>
            <Table<Transaction>
              className="transactions-table"
              loading={transactionsQuery.isFetching}
              dataSource={transactions}
              rowKey="_id"
              pagination={{
                current: transactionPagination.current,
                pageSize: transactionPagination.pageSize,
                total: transactionTotal,
                showSizeChanger: true,
                pageSizeOptions: ['20', '50', '100', '200'],
                onChange: handleTransactionsPagination,
                onShowSizeChange: handleTransactionsPagination,
              }}
              columns={[
                {
                  title: 'Ngày',
                  dataIndex: 'date',
                  render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
                },
                {
                  title: 'Danh mục',
                  dataIndex: 'category',
                },
                {
                  title: 'Ví',
                  dataIndex: ['wallet', 'name'],
                  render: (_, record) =>
                    typeof record.wallet === 'string'
                      ? wallets.find((w) => w._id === record.wallet)?.name
                      : record.wallet.name,
                },
                {
                  title: 'Loại',
                  dataIndex: 'type',
                  render: (value: string) => (
                    <Tag color={value === 'income' ? 'green' : 'red'}>
                      {value === 'income' ? 'Thu' : 'Chi'}
                    </Tag>
                  ),
                },
                {
                  title: 'Số tiền',
                  dataIndex: 'amount',
                  render: (value: number, record) => (
                    <Text type={record.type === 'income' ? 'success' : 'danger'}>
                      {record.type === 'income' ? '+' : '-'}
                      {currency(value)}
                    </Text>
                  ),
                },
                {
                  title: 'Ghi chú',
                  dataIndex: 'note',
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="section-card">
            <Title level={4}>Sao kê</Title>
            <Text type="secondary">
              {range[0]?.format('DD/MM/YYYY')} - {range[1]?.format('DD/MM/YYYY')}
            </Text>
            <div className="statement-card" style={{ marginTop: 16 }}>
              <Statistic title="Số dư đầu kỳ" value={statementQuery.data?.openingBalance ?? 0} prefix="₫" />
              <Statistic
                title="Tổng thu"
                value={statementQuery.data?.totalIncome ?? 0}
                valueStyle={{ color: '#3f8600' }}
                prefix="₫"
              />
              <Statistic
                title="Tổng chi"
                value={statementQuery.data?.totalExpense ?? 0}
                valueStyle={{ color: '#cf1322' }}
                prefix="₫"
              />
              <Statistic
                title="Số dư cuối kỳ"
                value={statementQuery.data?.closingBalance ?? 0}
                prefix="₫"
                valueStyle={{ fontWeight: 600 }}
              />
            </div>
            <Space style={{ marginTop: 16 }}>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handleExport('pdf')}
                loading={exportingFormat === 'pdf'}
                disabled={!selectedWalletId}
              >
                Xuất PDF
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                type="primary"
                onClick={() => handleExport('xlsx')}
                loading={exportingFormat === 'xlsx'}
                disabled={!selectedWalletId}
              >
                Xuất Excel
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        open={walletModalOpen}
        centered
        title="Thêm ví mới"
        onCancel={() => setWalletModalOpen(false)}
        onOk={handleWalletSubmit}
        okText="Lưu"
        confirmLoading={createWalletMutation.isPending}
      >
        <Form
          layout="vertical"
          form={walletForm}
          initialValues={{ initialBalance: 0, openedAt: dayjs() }}
        >
          <Form.Item label="Tên ví" name="name" rules={[{ required: true }]}>
            <Input placeholder="Ví tiền mặt" />
          </Form.Item>
          <Form.Item label="Số tài khoản" name="accountNumber">
            <Input placeholder="Tùy chọn" />
          </Form.Item>
          <Form.Item label="Số dư ban đầu" name="initialBalance" rules={[{ required: true }]}>
            <InputNumber prefix="₫" min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ngày tạo" name="openedAt" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default DashboardPage;


