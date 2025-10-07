-- migrations/15.sql

CREATE OR REPLACE FUNCTION get_professional_stats(professional_id_param INT)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'totalServices', (SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param),
        'monthlyServices', (SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param AND to_char(appointment_date, 'YYYY-MM') = to_char(now(), 'YYYY-MM')),
        'weeklyServices', (SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param AND to_char(appointment_date, 'IYYY-IW') = to_char(now(), 'IYYY-IW')),
        'topService', (SELECT row_to_json(t) FROM (SELECT service, COUNT(service) as count FROM appointments WHERE professional_id = professional_id_param GROUP BY service ORDER BY count DESC LIMIT 1) t),
        'topClient', (SELECT row_to_json(t) FROM (SELECT client_name, COUNT(client_name) as count FROM appointments WHERE professional_id = professional_id_param GROUP BY client_name ORDER BY count DESC LIMIT 1) t)
    ) INTO stats;
    
    RETURN stats;
END;
$$;
