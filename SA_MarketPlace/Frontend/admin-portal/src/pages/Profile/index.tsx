import { App, Form } from 'antd'
import { Outlet, useNavigate } from 'react-router'
import styled from 'styled-components'
import SACard from 'src/components/SACard'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import UnsavedChangesDialog from 'src/components/UnsavedChangesDialog'
import { useUnsavedChanges } from 'src/hooks/useUnsavedChanges'
import { getErrorMessage } from 'src/infra/errors'
import ChangePasswordForm from 'src/pages/Profile/components/ChangePasswordForm'
import PersonalDetailsForm from 'src/pages/Profile/components/PersonalDetailsForm'
import SessionCard from 'src/pages/Profile/components/SessionCard'
import SummaryCard from 'src/pages/Profile/components/SummaryCard'
import { profileChanges, type PersonalDetailsValues } from 'src/pages/Profile/profileChanges'
import { PATHS } from 'src/router/paths'
import { useGetProfileQuery, useUpdateProfileMutation } from 'src/store/profile/actions'

const TITLE = 'My profile'
const SUBTITLE = 'Manage your admin account details and password.'

// The signed-in admin's own account. Only the name is editable; leaving the page with an unsaved name asks first. The sign-out
// pop-up opens over it as a child route.
const ProfilePage = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { data: profile, error, isLoading, refetch } = useGetProfileQuery()
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()
  const [form] = Form.useForm<PersonalDetailsValues>()
  const edited = Form.useWatch([], form)
  // Until the form has mounted (the profile may arrive after the page first renders) the watched values are empty, and an empty name
  // is not an edit.
  const typedName = edited?.fullName
  const { blocker } = useUnsavedChanges(profile !== undefined && typeof typedName === 'string' && Object.keys(profileChanges(profile, { fullName: typedName })).length > 0)

  if (isLoading) {
    return (
      <>
        <SAPageHeader title={TITLE} subtitle={SUBTITLE} />
        <SASkeleton rows={8} />
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <SAPageHeader title={TITLE} subtitle={SUBTITLE} />
        <SALoadError what="your profile" error={error} onRetry={refetch} />
      </>
    )
  }

  // True when the change was saved.
  const save = async (values: PersonalDetailsValues): Promise<boolean> => {
    const changes = profileChanges(profile, values)
    if (Object.keys(changes).length === 0) {
      message.info('There is nothing to save.')
      return false
    }
    try {
      const saved = await updateProfile(changes).unwrap()
      form.setFieldsValue({ fullName: saved.fullName })
      message.success('Your details have been saved.')
      return true
    } catch (failure) {
      message.error(getErrorMessage(failure))
      return false
    }
  }

  // What the leave prompt runs: the same checks as the Save changes button, then the save.
  const saveBeforeLeaving = async () => {
    try {
      return await save(await form.validateFields())
    } catch {
      return false
    }
  }

  return (
    <>
      <SAPageHeader title={TITLE} subtitle={SUBTITLE} />
      <Columns>
        <Column>
          <PersonalDetailsForm profile={profile} form={form} loading={isSaving} onSave={save} />
          <SACard title="Change password">
            <ChangePasswordForm passwordLength={profile.passwordLength} />
          </SACard>
        </Column>
        <Column>
          <SummaryCard profile={profile} />
          <SessionCard onSignOut={() => navigate(PATHS.signOut)} />
        </Column>
      </Columns>
      <Outlet />
      <UnsavedChangesDialog blocker={blocker} onSave={saveBeforeLeaving} />
    </>
  )
}

export default ProfilePage

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: ${({ theme }) => theme.margin}px;
  align-items: start;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
`
