from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from routes.predict_routes    import predict_bp
from routes.monitoring_routes import monitoring_bp
from services.flow_service    import flow_service
from services.capture_service import capture_service
from services.model_service   import model_service

socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__)
    CORS(app)

    socketio.init_app(app)

    app.register_blueprint(predict_bp)
    app.register_blueprint(monitoring_bp)

    # Services wire up
    flow_service.init(model_service, socketio)
    capture_service.init(flow_service)

    return app

app = create_app()

if __name__ == '__main__':
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )