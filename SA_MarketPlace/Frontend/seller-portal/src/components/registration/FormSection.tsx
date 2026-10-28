import styled from 'styled-components'

// A titled group of fields in a long form, divided from the next group by a line.
const FormSection = styled.section`
  padding-bottom: ${({ theme }) => theme.paddingXS}px;
  margin-bottom: ${({ theme }) => theme.marginLG}px;
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};

  h2.ant-typography {
    margin-bottom: ${({ theme }) => theme.margin}px;
  }
`

export default FormSection
