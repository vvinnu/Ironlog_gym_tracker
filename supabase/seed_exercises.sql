-- Run AFTER schema.sql, in Supabase SQL Editor (admin context).
-- Global exercise entries have user_id = NULL; app users can read but not modify them.
insert into public.exercises (name, primary_muscle, equipment)
values
 ('Lat Pulldown','Back','Cable'),
 ('Pull-up','Back','Bodyweight'),
 ('Seated Cable Row','Back','Cable'),
 ('Reverse Fly','Shoulders','Machine'),
 ('Biceps Curl Machine','Arms','Machine'),
 ('Hammer Curl','Arms','Dumbbell'),
 ('Bench Press','Chest','Barbell'),
 ('Incline Dumbbell Press','Chest','Dumbbell'),
 ('Shoulder Press','Shoulders','Dumbbell'),
 ('Lateral Raise','Shoulders','Dumbbell'),
 ('Leg Press','Legs','Machine'),
 ('Squat','Legs','Barbell'),
 ('Romanian Deadlift','Legs','Barbell'),
 ('Leg Curl','Legs','Machine'),
 ('Calf Raise','Legs','Machine'),
 ('Cable Triceps Pushdown','Arms','Cable'),
 ('Plank','Core','Bodyweight'),
 ('Cable Crunch','Core','Cable'),
 ('Deadlift','Back','Barbell'),
 ('Chest Fly','Chest','Machine'),
 ('Leg Extension','Legs','Machine'),
 ('Bulgarian Split Squat','Legs','Dumbbell'),
 ('Hip Thrust','Legs','Barbell'),
 ('Face Pull','Shoulders','Cable'),
 ('Dips','Arms','Bodyweight'),
 ('Push-up','Chest','Bodyweight'),
 ('Running','Cardio','Treadmill'),
 ('Cycling','Cardio','Stationary Bike')
on conflict do nothing;
