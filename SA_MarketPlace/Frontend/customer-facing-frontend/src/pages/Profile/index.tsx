import { App, Form } from 'antd'
import { Outlet, useNavigate } from 'react-router'
import styled from 'styled-components'
import PageLayout from 'src/components/layouts/PageLayout'
import SALoadError from 'src/components/SALoadError'
import SASkeleton from 'src/components/SASkeleton'
import UnsavedChangesDialog from 'src/components/UnsavedChangesDialog'
import { useUnsavedChanges } from 'src/hooks/useUnsavedChanges'
import { getErrorMessage } from 'src/infra/errors'
import ChangePasswordForm, { type ChangePasswordValues } from 'src/pages/Profile/components/ChangePasswordForm'
import PersonalDetailsForm, { type PersonalDetailsValues } from 'src/pages/Profile/components/PersonalDetailsForm'
import ProfileSummaryCard from 'src/pages/Profile/components/ProfileSummaryCard'
import SessionCard from 'src/pages/Profile/components/SessionCard'
import { profileChanges } from 'src/pages/Profile/profileChanges'
import { PATHS } from 'src/router/paths'
import { useChangePasswordMutation, useGetProfileQuery, useUpdateProfileMutation } from 'src/store/profile/actions'

const TITLE = 'My profile'
const SUBTITLE = 'Manage your personal details and password. Changes apply across the marketplace and Collection Manager.'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { data: profile, error, isLoading, refetch } = useGetProfileQuery()
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation()
  const [form] = Form.useForm<PersonalDetailsValues>()
  const edited = Form.useWatch([], form)
  // Until the form has mounted (the profile may arrive after the page first renders) the watched values are empty, and that is not an edit.
  const formReady = typeof edited?.firstName === 'string' && typeof edited.lastName === 'string' && typeof edited.phone === 'string'
  const { blocker } = useUnsavedChanges(profile !== undefined && edited !== undefined && formReady && Object.keys(profileChanges(profile, edited)).length > 0)

  if (isLoading) {
    return (
      <PageLayout title={TITLE} subtitle={SUBTITLE}>
        <SASkeleton rows={8} />
      </PageLayout>
    )
  }

  if (!profile) {
    return (
      <PageLayout title={TITLE} subtitle={SUBTITLE}>
        <SALoadError what="your profile" error={error} onRetry={refetch} />
      </PageLayout>
    )
  }

  // True when the changes were saved.
  const save = async (values: PersonalDetailsValues): Promise<boolean> => {
    const changes = profileChanges(profile, values)
    if (Object.keys(changes).length === 0) {
      message.info('There is nothing to save.')
      return false
    }
    try {
      await updateProfile(changes).unwrap()
      message.success('Your details have been saved.')
      return true
    } catch (error) {
      message.error(getErrorMessage(error))
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

  const updatePassword = async ({ newPassword }: ChangePasswordValues) => {
    try {
      await changePassword({ newPassword }).unwrap()
      message.success('Your password has been updated. Your other devices have been signed out.')
      return true
    } catch (error) {
      message.error(getErrorMessage(error))
      return false
    }
  }

  return (
    <PageLayout title={TITLE} subtitle={SUBTITLE}>
      <Columns>
        <Column>
          <PersonalDetailsForm form={form} profile={profile} loading={isSaving} onSave={save} />
          <ChangePasswordForm passwordLength={profile.passwordLength} loading={isChangingPassword} onSubmit={updatePassword} />
        </Column>
        <Column>
          <ProfileSummaryCard {...profile} />
          <SessionCard onSignOut={() => navigate(PATHS.signOut)} />
        </Column>
      </Columns>
      <Outlet />
      <UnsavedChangesDialog blocker={blocker} onSave={saveBeforeLeaving} />
    </PageLayout>
  )
}

export default ProfilePage

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.marginLG}px;
  align-items: start;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
`
