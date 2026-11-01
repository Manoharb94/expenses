-- RUN 1: add the new column
alter table transactions add column if not exists kind text default 'bank';

-- RUN 2: new reader (replaces the old one)
create or replace function parse_txn() returns trigger
language plpgsql security definer set search_path = public as $$
declare a text[]; d text[]; m text[]; r text[]; t text := new.raw; pi int; po int;
begin
  if t is null then return new; end if;
  -- 1) amount written right next to "debited/credited/sent/spent/paid"
  a := regexp_match(t, '(?:\m(?:Rs|INR)\.?|₹)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s+(?:has been |is |was |were )?(?:successfully )?(?:debited|credited|deposited|withdrawn)', 'i');
  if a is null then a := regexp_match(t, '(?:debited|credited|sent|spent|paid|received|withdrawn)\s+(?:by\s+|with\s+|for\s+)?(?:\m(?:Rs|INR)\.?|₹)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)', 'i'); end if;
  -- 2) fallback: first real "Rs"/"INR"/₹ amount (not letters inside another word)
  if a is null then a := regexp_match(t, '(?:\m(?:Rs|INR)\.?|₹)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)', 'i'); end if;
  if a is not null then new.amount := replace(a[1], ',', '')::numeric; end if;
  -- type: whichever keyword appears first in the message
  new.type := null;
  pi := position(coalesce((regexp_match(lower(t), '(credited|received|deposited|refund)'))[1],'~~~~') in lower(t));
  po := position(coalesce((regexp_match(lower(t), '(debited|sent|spent|paid|withdrawn|purchase)'))[1],'~~~~') in lower(t));
  if pi > 0 and (po = 0 or pi < po) then new.type := 'in';
  elsif po > 0 then new.type := 'out';
  elsif pi = 0 and t ~* '\mus(?:ing|ed)\M' then new.type := 'out'; end if;
  if new.amount is null or new.type is null then return null; end if;
  if t ~* 'credit\s+card\s*(?:ending|no\.?|xx|x+|\*+|[0-9])' and t !~* 'account\s+(?:ending|no|xx|x+)' then new.kind := 'card'; else new.kind := 'bank'; end if;
  d := regexp_match(t, '(?<![0-9])(20[0-9]{2})-([0-9]{2})-([0-9]{2})(?![0-9])');
  if d is not null then
    new.txn_date := make_date(d[1]::int, d[2]::int, d[3]::int);
  else
  d := regexp_match(t, '(?<![0-9])(\d{2})[/-](\d{2})[/-](\d{2,4})(?![0-9])');
  if d is not null then
    new.txn_date := make_date(case when length(d[3])=2 then 2000+d[3]::int else d[3]::int end, d[2]::int, d[1]::int);
  else
    d := regexp_match(t, '(?<![0-9])([0-9]{1,2})[ -](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?[ -]+(20[0-9]{2})', 'i');
    if d is not null then
      new.txn_date := make_date(d[3]::int, (position(lower(d[2]) in 'janfebmaraprmayjunjulaugsepoctnovdec')+2)/3, d[1]::int);
    else new.txn_date := current_date; end if;
  end if;
  end if;
  m := regexp_match(t, '(?:towards|by|from)\s+VPA\s+\S+\s+\(([^)]+)\)', 'i');
  if m is null then m := regexp_match(t, '\mTo\s+?(.+?)\s+?On\s+\d'); end if;
  if m is null then m := regexp_match(t, 'from\s+VPA\s+([^\s(]+)', 'i'); end if;
  if m is null then m := regexp_match(t, '(?:towards|by)\s+VPA\s+(\S+)', 'i'); end if;
  if m is null then m := regexp_match(t, '\sat\s+(.+?)\s+on\s+\d', 'i'); end if;
  if m is null then m := regexp_match(t, 'towards\s+(?!VPA)(.+?)\s+on\s+\d', 'i'); end if;
  new.merchant := coalesce(regexp_replace(trim(m[1]), '\s+', ' ', 'g'), 'Unknown');
  r := regexp_match(t, '(?:Ref|UPI)\s+([0-9]{9,})', 'i');
  if r is null then r := regexp_match(t, 'reference\s*(?:no\.?)?\s*:?\s*([0-9]{9,})', 'i'); end if;
  new.ref := coalesce(r[1], 'h' || md5(t));
  if new.kind = 'card' and new.type = 'in' then new.merchant := 'Credit card bill payment'; end if;
  new.merchant_key := lower(regexp_replace(new.merchant, '[^a-zA-Z0-9]+', '-', 'g'));
  select category into new.category from merchants where merchant_key = new.merchant_key;
  if new.category is null then
    if new.kind = 'card' and new.type = 'in' and t ~* 'payment' then new.category := 'Credit card bill (paid)';
    elsif new.kind = 'bank' and new.type = 'out' and t ~* 'credit\s*card|cc\s*payment|cardpay' then new.category := 'Credit card bill (paid)'; end if;
  end if;
  return new;
end $$;

-- RUN 3: your own UPI ID is a transfer between you and your wife
insert into merchants (merchant_key, name, category) values ('er-manoharb-1-okaxis','er.manoharb-1@okaxis','Transfer between us') on conflict (merchant_key) do update set category = excluded.category;

-- RUN 4: re-read everything already saved with the new reader
create temp table old_rows as select raw, person, note from transactions where raw is not null;
delete from transactions where raw is not null;
insert into transactions (raw, person, note) select raw, person, note from old_rows;
select person, count(*), sum(amount) filter (where type='out') as spent from transactions group by person;
