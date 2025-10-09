-- migrations/15.sql

CREATE OR REPLACE FUNCTION get_professional_stats(professional_id_param INT)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'totalServices', COALESCE((SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param), 0),
        'monthlyServices', COALESCE((SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param AND DATE_TRUNC('month', appointment_date) = DATE_TRUNC('month', NOW())), 0),
        'weeklyServices', COALESCE((SELECT COUNT(*) FROM appointments WHERE professional_id = professional_id_param AND DATE_TRUNC('week', appointment_date) = DATE_TRUNC('week', NOW())), 0),
        'topService', (SELECT row_to_json(t) FROM (SELECT service, COUNT(service) as count FROM appointments WHERE professional_id = professional_id_param GROUP BY service ORDER BY count DESC LIMIT 1) t),
        'topClient', (SELECT row_to_json(t) FROM (SELECT client_name, COUNT(client_name) as count FROM appointments WHERE professional_id = professional_id_param GROUP BY client_name ORDER BY count DESC LIMIT 1) t)
    ) INTO stats;

    RETURN stats;
END;
$$;
