import { Button, Result } from 'antd'
import type { ResultStatusType } from 'antd/es/result'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import { useDocumentTitle } from 'src/hooks/useDocumentTitle'
import { PATHS } from 'src/router/paths'

interface Props {
  status: ResultStatusType
  title: string
  subTitle?: string
}

// One look for every error: 404, 403, 500 and the router's own error boundary.
const SAErrorPage = ({ status, title, subTitle }: Props) => {
  const navigate = useNavigate()
  useDocumentTitle(title)
  return (
    <Center>
      <Result
        status={status}
        // Ant Design draws the title in a div; the page still needs its h1.
        title={<Heading>{title}</Heading>}
        subTitle={subTitle}
        extra={
          <Button type="primary" onClick={() => navigate(PATHS.suppliers)}>
            Back to suppliers
          </Button>
        }
      />
    </Center>
  )
}

export default SAErrorPage

const Center = styled.main`
  display: grid;
  place-items: center;
  min-height: 100vh;
`

const Heading = styled.h1`
  margin: 0;
  font: inherit;
`
