import { Button, Checkbox, Flex, Typography } from 'antd'
import styled from 'styled-components'
import CardLabel from 'src/pages/OrderFulfilment/components/CardLabel'
import { allPicked, lineKey } from 'src/store/orders/selector'
import type { OrderLine } from 'src/store/orders/types'

interface Props {
  lines: OrderLine[]
  /** `pick`: the seller ticks lines off before dispatching. `packed`: it has gone out, so every line shows as done. `plain`: a cancelled order. */
  mode: 'pick' | 'packed' | 'plain'
  picked: ReadonlySet<string>
  onToggle: (key: string) => void
  onMarkAll: () => void
}

// What to put in the box. The ticks are only on this screen: the backend has no picking status, so a refresh clears them.
const PickList = ({ lines, mode, picked, onToggle, onMarkAll }: Props) => (
  <Card aria-label="Pick list">
    <Flex justify="space-between" align="center">
      <CardLabel>Pick list</CardLabel>
      {mode === 'pick' && !allPicked(lines, picked) && (
        <Button type="link" size="small" onClick={onMarkAll}>
          Mark all picked
        </Button>
      )}
    </Flex>
    <List>
      {lines.map((line) => (
        <li key={lineKey(line)}>
          {mode === 'plain' ? (
            <Text line={line} />
          ) : (
            <Checkbox
              checked={mode === 'packed' || picked.has(lineKey(line))}
              disabled={mode === 'packed'}
              onChange={() => onToggle(lineKey(line))}
            >
              <Text line={line} />
            </Checkbox>
          )}
        </li>
      ))}
    </List>
  </Card>
)

const Text = ({ line }: { line: OrderLine }) => (
  <>
    {line.productName} × {line.quantity} <Typography.Text type="secondary">({line.sku})</Typography.Text>
  </>
)

export default PickList

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const List = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.marginSM}px;
  margin: 0;
  padding: 0;
  list-style: none;
`
