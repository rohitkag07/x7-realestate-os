create trigger set_updated_at_playbook_media_assets
  before update on public.playbook_media_assets
  for each row execute function public.set_updated_at();
