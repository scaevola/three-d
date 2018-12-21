
use dust::*;

pub struct Triangle {
    program: program::Program,
    model: surface::TriangleSurface
}

impl Triangle
{
    pub fn create(gl: &gl::Gl) -> Result<Triangle, traits::Error>
    {
        let indices: Vec<u32> = (0..3).collect();
        let positions: Vec<f32> = vec![
            0.5, -0.5, 0.0, // bottom right
            -0.5, -0.5, 0.0,// bottom left
            0.0,  0.5, 0.0 // top
        ];
        let colors: Vec<f32> = vec![
            1.0, 0.0, 0.0,   // bottom right
            0.0, 1.0, 0.0,   // bottom left
            0.0, 0.0, 1.0    // top
        ];
        let program = program::Program::from_resource(&gl, "examples/assets/shaders/color", "examples/assets/shaders/color")?;
        let mut model = surface::TriangleSurface::create(gl, &indices)?;
        model.add_attributes(&program, &att!["position" => (positions, 3), "color" => (colors, 3)])?;

        Ok(Triangle { program, model })
    }

    pub fn render(&self, camera: &camera::Camera) -> Result<(), traits::Error>
    {
        self.program.add_uniform_mat4("viewMatrix", camera.get_view())?;
        self.program.add_uniform_mat4("projectionMatrix", camera.get_projection())?;
        self.model.render()?;
        Ok(())
    }
}
