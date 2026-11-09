create or replace function private.retro_command(action text, payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<cmd>>
declare
 uid uuid:=auth.uid(); guest boolean; nm text; r public.retros%rowtype; item public.retro_items%rowtype; c public.retro_comments%rowtype;
 iid uuid; cid uuid; kind text; title text; descr text; category text; owner uuid; status text; due date; mins integer; token text; old_uid uuid;
begin
 if uid is null then raise exception 'Sign in before continuing.' using errcode='42501'; end if;
 select is_anonymous into guest from auth.users where id=uid;
 if not found then raise exception 'Session is no longer valid.' using errcode='42501'; end if;
 if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid request.'; end if;
 select coalesce(nullif(btrim(payload->>'name'),''),nullif(btrim(raw_user_meta_data->>'full_name'),''),nullif(split_part(email,'@',1),''),'Guest') into nm from auth.users where id=uid;
 if length(nm)>100 then raise exception 'Name must be at most 100 characters.'; end if;
 insert into public.profiles(id,display_name) values(uid,nm) on conflict(id) do nothing;
 if action='profile' then
  if nullif(btrim(payload->>'name'),'') is null then raise exception 'Enter your full name.'; end if;
  update public.profiles set display_name=nm where id=uid;
  update public.retros set revision=revision+1,updated_at=now() where id in(select retro_id from public.retro_members where user_id=uid);
  return jsonb_build_object('ok',true);
 end if;
 if action='prepare_guest_merge' then
  if not guest then return jsonb_build_object('token',null); end if;
  token:=encode(extensions.gen_random_bytes(24),'hex');
  insert into private.guest_merge_proofs(token_hash,guest_id) values(encode(extensions.digest(token,'sha256'),'hex'),uid) on conflict(guest_id) do update set token_hash=excluded.token_hash,expires_at=now()+interval '24 hours';
  return jsonb_build_object('token',token);
 end if;
 if action='merge_guest' then
  if guest then raise exception 'Log in to a registered account first.'; end if;
  select guest_id into old_uid from private.guest_merge_proofs where token_hash=encode(extensions.digest(coalesce(payload->>'token',''),'sha256'),'hex') and expires_at>now() for update;
  if old_uid is null or old_uid=uid then raise exception 'Guest history link has expired or was already used.'; end if;
  if not exists(select 1 from auth.users where id=old_uid and is_anonymous) then raise exception 'Invalid guest history link.'; end if;
  -- Lock every affected room in stable order before transferring identity and roles.
  perform id from public.retros where id in(select retro_id from public.retro_members where user_id=old_uid) order by id for update;
  insert into public.retro_members(retro_id,user_id,joined_at) select retro_id,uid,joined_at from public.retro_members where user_id=old_uid on conflict do nothing;
  update public.retro_host_keys set host_key=encode(extensions.gen_random_bytes(24),'hex'),rotated_at=now() where retro_id in(select id from public.retros where host_id=old_uid);
  update public.retros set host_id=uid where host_id=old_uid;
  update public.retros set created_by=uid where created_by=old_uid;
  update public.retro_items set author_id=uid where author_id=old_uid;
  update public.retro_items set owner_id=uid where owner_id=old_uid;
  update public.retro_comments set author_id=uid where author_id=old_uid;
  insert into public.item_votes(retro_id,item_id,user_id) select retro_id,item_id,uid from public.item_votes where user_id=old_uid on conflict do nothing;
  delete from public.item_votes where user_id=old_uid;
  insert into public.comment_votes(retro_id,comment_id,user_id) select retro_id,comment_id,uid from public.comment_votes where user_id=old_uid on conflict do nothing;
  delete from public.comment_votes where user_id=old_uid;
  update public.retros set revision=revision+1,updated_at=now() where id in(select retro_id from public.retro_members where user_id=old_uid);
  delete from public.retro_members where user_id=old_uid;
  delete from private.guest_merge_proofs where guest_id=old_uid;
  return jsonb_build_object('ok',true);
 end if;
 if action='create' then
  title:=btrim(coalesce(payload->>'title','')); mins:=coalesce((payload->>'duration')::integer,0);
  if length(title) not between 1 and 120 then raise exception 'Enter a sprint name of up to 120 characters.'; end if;
  if mins not in(0,5,10,15,30) then raise exception 'Choose a valid duration.'; end if;
  if guest and nullif(btrim(payload->>'name'),'') is null then raise exception 'Enter your full name.'; end if;
  update public.profiles set display_name=nm where id=uid;
  insert into public.retros(title,host_id,created_by,duration_minutes,ends_at,allow_guests) values(title,uid,uid,mins,case when mins=0 then null else now()+make_interval(mins=>mins) end,coalesce((payload->>'allow_guests')::boolean,true)) returning * into r;
  insert into public.retro_members(retro_id,user_id) values(r.id,uid);
  insert into public.retro_host_keys(retro_id) values(r.id);
  return jsonb_build_object('ok',true,'id',r.id,'slug',r.invite_slug);
 end if;
 select * into r from public.retros where invite_slug=payload->>'slug' for update;
 if not found then raise exception 'This retrospective was not found.'; end if;
 if action='join' then
  if guest and not r.allow_guests and not private.is_member(r.id) then raise exception 'This retrospective requires a registered account.' using errcode='42501'; end if;
  if guest and nullif(nm,'Guest') is null then raise exception 'Enter your full name.'; end if;
  update public.profiles set display_name=nm where id=uid and nullif(btrim(payload->>'name'),'') is not null;
  insert into public.retro_members(retro_id,user_id) values(r.id,uid) on conflict do nothing;
  if found or nullif(btrim(payload->>'name'),'') is not null then update public.retros set revision=revision+1,updated_at=now() where id=r.id; end if;
  return jsonb_build_object('ok',true);
 end if;
 if not private.is_member(r.id) then raise exception 'Join this retrospective first.' using errcode='42501'; end if;
 if action='claim_host' then
  if not exists(select 1 from public.retro_host_keys where retro_id=r.id and host_key=payload->>'key') then raise exception 'The host key is invalid or has already been used.' using errcode='42501'; end if;
  update public.retros set host_id=uid where id=r.id;
  update public.retro_host_keys set host_key=encode(extensions.gen_random_bytes(24),'hex'),rotated_at=now() where retro_id=r.id;
 elsif action='settings' then
  if r.host_id<>uid then raise exception 'Only the host can change settings.' using errcode='42501'; end if;
  if payload ? 'allow_guests' then update public.retros set allow_guests=(payload->>'allow_guests')::boolean where id=r.id; end if;
  if payload ? 'extend' then
   mins:=(payload->>'extend')::integer;
   if mins not in(0,5,10,15,30) then raise exception 'Choose a valid timer increment.'; end if;
   update public.retros set ends_at=case when mins=0 then null else greatest(coalesce(ends_at,now()),now())+make_interval(mins=>mins) end,duration_minutes=case when mins=0 then 0 else duration_minutes+mins end where id=r.id;
  end if;
 elsif action='item_save' then
  iid:=nullif(payload->>'id','')::uuid;
  if iid is not null then
   select * into item from public.retro_items where id=iid and retro_id=r.id for update;
   if not found then raise exception 'Item no longer exists.'; end if;
   kind:=item.kind;
   if (payload->>'version')::integer is distinct from item.version then raise exception 'This item changed. Reload it before saving.' using errcode='40001'; end if;
   if r.host_id<>uid and (kind='action' or item.author_id<>uid) then raise exception 'You cannot edit this item.' using errcode='42501'; end if;
  else kind:=payload->>'kind'; end if;
  if kind not in('reflection','action') or kind is null then raise exception 'Invalid item type.'; end if;
  if kind='action' and r.host_id<>uid then raise exception 'Only the host can change action items.' using errcode='42501'; end if;
  title:=btrim(coalesce(payload->>'title','')); descr:=coalesce(payload->>'description','');
  if length(title) not between 1 and 240 or length(descr)>10000 then raise exception 'Title must be 1–240 characters; description at most 10,000.'; end if;
  category:=coalesce(payload->>'category',item.category,'Kudos'); status:=coalesce(payload->>'status',item.status,'To do');
  owner:=nullif(payload->>'owner_id','')::uuid; due:=nullif(payload->>'due_date','')::date;
  if owner is not null and not exists(select 1 from public.retro_members where retro_id=r.id and user_id=owner) then raise exception 'Choose an attendee as owner.'; end if;
  if iid is null then
   insert into public.retro_items(retro_id,author_id,kind,category,title,description,owner_id,status,due_date) values(r.id,uid,kind,category,title,descr,owner,status,due) returning id into iid;
  else
   update public.retro_items set category=cmd.category,title=cmd.title,description=descr,owner_id=owner,status=cmd.status,due_date=due,version=version+1,updated_at=now() where id=iid;
  end if;
 elsif action in('item_delete','item_vote','comment_save') then
  iid:=(payload->>'item_id')::uuid;
  select * into item from public.retro_items where id=iid and retro_id=r.id for update;
  if not found then raise exception 'Item no longer exists.'; end if;
  if item.kind='action' and r.host_id<>uid then raise exception 'Only the host can change action items.' using errcode='42501'; end if;
  if action='item_delete' then
   if r.host_id<>uid and item.author_id<>uid then raise exception 'You cannot delete this item.' using errcode='42501'; end if;
   delete from public.retro_items where id=iid;
  elsif action='item_vote' then
   if coalesce((payload->>'active')::boolean,false) then insert into public.item_votes(retro_id,item_id,user_id) values(r.id,iid,uid) on conflict do nothing;
   else delete from public.item_votes where item_id=iid and user_id=uid; end if;
  else
   descr:=btrim(coalesce(payload->>'body','')); cid:=nullif(payload->>'id','')::uuid;
   if length(descr) not between 1 and 4000 then raise exception 'Comment must be 1–4,000 characters.'; end if;
   if cid is null then insert into public.retro_comments(retro_id,item_id,author_id,body) values(r.id,iid,uid,descr) returning id into cid;
   else
    select * into c from public.retro_comments where id=cid and item_id=iid for update;
    if not found or (c.author_id<>uid and r.host_id<>uid) then raise exception 'You cannot edit this comment.' using errcode='42501'; end if;
    if (payload->>'version')::integer is distinct from c.version then raise exception 'This comment changed. Reload before saving.' using errcode='40001'; end if;
    update public.retro_comments set body=descr,version=version+1,updated_at=now() where id=cid;
   end if;
  end if;
 elsif action in('comment_delete','comment_vote') then
  cid:=(payload->>'comment_id')::uuid;
  select * into c from public.retro_comments where id=cid and retro_id=r.id for update;
  if not found then raise exception 'Comment no longer exists.'; end if;
  select * into item from public.retro_items where id=c.item_id;
  if item.kind='action' and r.host_id<>uid then raise exception 'Only the host can change action items.' using errcode='42501'; end if;
  if action='comment_delete' then
   if c.author_id<>uid and r.host_id<>uid then raise exception 'You cannot delete this comment.' using errcode='42501'; end if;
   delete from public.retro_comments where id=cid;
  elsif coalesce((payload->>'active')::boolean,false) then insert into public.comment_votes(retro_id,comment_id,user_id) values(r.id,cid,uid) on conflict do nothing;
  else delete from public.comment_votes where comment_id=cid and user_id=uid; end if;
 else raise exception 'Unknown retrospective operation.';
 end if;
 update public.retros set revision=revision+1,updated_at=now() where id=r.id;
 return jsonb_build_object('ok',true,'id',case when action='comment_save' then cid else iid end,'slug',r.invite_slug);
end;
$$;

create policy deny_direct_guest_proof_access on private.guest_merge_proofs for all to authenticated using(false) with check(false);
create index item_votes_parent_idx on public.item_votes(retro_id,item_id);
create index comments_parent_idx on public.retro_comments(retro_id,item_id);
create index comment_votes_parent_idx on public.comment_votes(retro_id,comment_id);
notify pgrst,'reload schema';
