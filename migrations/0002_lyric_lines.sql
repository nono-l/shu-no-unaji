create table if not exists lyric_lines (
  line_index integer primary key,
  offset_ms integer not null,
  locked boolean not null default false
);