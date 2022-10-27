import { Card, Col, Divider, Row, Typography } from "antd";
import { FilterEntityForm } from "../components/SubgraphBridgeComponents/Something";

const { Title } = Typography;

export default function ExampleUI({
  purpose,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  return (
    <div>
      <FilterEntityForm />
      <div>
        <Row justify="center">
          <Col span={12}>
            <Card>
              <Title>Query Escort</Title>
              <Title level={4}>
                This formats the query string from graphQl, and removes all the variables and submits this to the
                subgraph bridge contract.
              </Title>
            </Card>
          </Col>
        </Row>
      </div>
      <Divider />
      <div>
        <Title>Actually literally query the bridge</Title>
        <Title level={4}>
          This just uses the above query template string, and queries the decentralized network on goerli, and deals
          with the nonsense of handling the attestations yourself.
        </Title>
      </div>
      <Divider />
      <div>
        <Title>Actually literally query the bridge</Title>
        <Title level={4}>
          This just uses the above query template string, and queries the decentralized network on goerli, and deals
          with the nonsense of handling the attestations yourself.
        </Title>
      </div>
    </div>
  );
}
