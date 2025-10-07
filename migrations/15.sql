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
        'monthlyServices', (SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param AND strftime('%Y-%m', appointment_date) = strftime('%Y-%m', 'now')),
        'weeklyServices', (SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param AND strftime('%W', appointment_date) = strftime('%W', 'now')),
        'topService', (SELECT row_to_json(t) FROM (SELECT service, COUNT(service) as count FROM appointments WHERE professional_id = professional_id_param GROUP BY service ORDER BY count DESC LIMIT 1) t),
        'topClient', (SELECT row_to_json(t) FROM (SELECT client_name, COUNT(client_name) as count FROM appointments WHERE professional_id = professional_id_param GROUP BY client_name ORDER BY count DESC LIMIT 1) t)
    ) INTO stats;
    
    RETURN stats;
END;
$$;
