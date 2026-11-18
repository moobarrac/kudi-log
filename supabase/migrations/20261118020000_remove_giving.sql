-- "Church & giving" was removed as a category. Its entries (offering, tithe, donations...) move to Gifts,
-- where those words are now matched too. Entries keep everything else.
update public.entries set category = 'gifts' where category = 'giving';
