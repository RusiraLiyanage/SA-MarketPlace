import { Skeleton } from 'antd'

// A placeholder while data loads. Screen readers get "Loading" once; the grey blocks (and the empty heading Ant Design
// draws in them) are hidden from them.
const SASkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div role="status" aria-busy="true" aria-label="Loading">
    <div aria-hidden>
      <Skeleton active paragraph={{ rows }} />
    </div>
  </div>
)

export default SASkeleton
