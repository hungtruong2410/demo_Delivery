import http from "k6/http";
import { check } from "k6";

export const options = {
    vus: 20,
    duration: "10s",

    thresholds: {
        // ❌ Nếu muốn CI FAIL khi có request lỗi → bỏ comment dòng dưới:
        // "http_req_failed": ["rate<0.001"],

        // ❌ Nếu muốn CI FAIL khi p95 > 10ms → bỏ comment dòng dưới:
        // "http_req_duration": ["p(95)<10"],
    },
};

export default function () {
    const res = http.get("http://localhost:3000/");

    check(res, {
        "status is 200": (r) => r.status === 200,
    });
}
